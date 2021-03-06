const uuid = require('uuid').v4
const _ = require('lodash')
const { DOMAIN } = require('../config');
const { changeBulbState, getBulbState, doIntentJob, client } = require('./function.js');
const axios = require('axios');


class Directive {
  constructor({ namespace, name, payload }) {
    this.header = {
      messageId: uuid(),
      namespace: namespace,
      name: name,
    }
    this.payload = payload
  }
}

class CEKRequest {
  constructor(httpReq) {
    this.request = httpReq.body.request
    this.context = httpReq.body.context
    this.session = httpReq.body.session
    console.log(`CEK Request: ${JSON.stringify(this.context)}, ${JSON.stringify(this.session)}`)
  }

  async do(cekResponse) {
    switch (this.request.type) {
      case 'LaunchRequest':
        return this.launchRequest(cekResponse)
      case 'IntentRequest':
        return await this.intentRequest(cekResponse)
      case 'SessionEndedRequest':
        return this.sessionEndedRequest(cekResponse)
    }
  }

  launchRequest(cekResponse) {
    console.log('launchRequest')
    cekResponse.setSimpleSpeechText('원하는걸 말해주세요');
    cekResponse.setMultiturn({
      intent: 'controlHue'
    })
  }

  // 전달받은 intent를 가지고 응답을 결정하는 부분
  async intentRequest(cekResponse) {
    console.log('intentRequest')
    const intent = this.request.intent.name // 전달받은 intent
    const slots = this.request.intent.slots // 전달 받은 slots

    await doIntentJob(intent, slots, cekResponse); // intent, slot 을 넘겨주고 응답을 결정함 
    if (this.session.new == false) {
      cekResponse.setMultiturn()
    }
  }

  sessionEndedRequest(cekResponse) {
    console.log('sessionEndedRequest')
    cekREsponse.setSimpleSpeechText('음성 제어를 종료합니다');
    cekResponse.clearMultiturn()
  }
}

class CEKResponse {
  constructor() {
    console.log('CEKResponse constructor')
    this.response = {
      directives: [],
      shouldEndSession: true,
      outputSpeech: {},
      card: {},
    }
    this.version = '0.1.0'
    this.sessionAttributes = {}
  }

  setMultiturn(sessionAttributes) {
    this.response.shouldEndSession = false
    this.sessionAttributes = _.assign(this.sessionAttributes, sessionAttributes)
  }

  clearMultiturn() {
    this.response.shouldEndSession = true
    this.sessionAttributes = {}
  }

  setSimpleSpeechText(outputText) {
    this.response.outputSpeech = {
      type: 'SimpleSpeech',
      values: {
        type: 'PlainText',
        lang: 'ko',
        value: outputText,
      },
    }
  }

  appendSpeechText(outputText) {
    const outputSpeech = this.response.outputSpeech
    if (outputSpeech.type != 'SpeechList') {
      outputSpeech.type = 'SpeechList'
      outputSpeech.values = []
    }
    if (typeof (outputText) == 'string') {
      outputSpeech.values.push({
        type: 'PlainText',
        lang: 'ko',
        value: outputText,
      })
    } else {
      outputSpeech.values.push(outputText)
    }
  }
}

const clovaReq = async function (httpReq, httpRes, next) {
  cekResponse = new CEKResponse()
  cekRequest = new CEKRequest(httpReq)
  await cekRequest.do(cekResponse);
  console.log(`CEKResponse: ${JSON.stringify(cekResponse)}`)
  return httpRes.send(cekResponse)
};

module.exports = clovaReq;
