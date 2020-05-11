const mqtt = require("mqtt");
const options = {
  host: "13.125.207.178",
  port: 1883,
  protocol: "mqtt",
};

const client = mqtt.connect(options);

client.on("connect", () => {
  console.log("[sys] mqtt 연결됨");
});
client.on("disconnect", () => {
  console.log("[sys] mqtt 연결 끊김");
});

const subscribeList = [
  'clova/res/hue/changeStatus/+',
  'clova/res/hue/status',
  'clova/res/room',
  'clova/res/hueAssignInfo',
  'clova/res/changeHueRoom'
]

subscribeList.forEach(topic => {
  client.subscribe(topic);
})

// backend에서 받아올 정보가 있다면 사용하는 함수. mqtt를 사용해서 정보를 받아온다 
function requestData(pubTopic, pubMessage) {
  return new Promise((resolve, reject) => {
    try {
      client.publish(pubTopic, pubMessage, {}, () => {
        client.on("message", (subTopic, subMessage) => {
          if (
            pubTopic.split("/").splice(2).join("") ===
            subTopic.split("/").splice(2).join("")
          ) {
            // console.log(JSON.parse(subMessage));
            resolve(JSON.parse(subMessage));
          }
        });
      });
    } catch (e) {
      console.error(e);
    }
  });
}

const doIntentJob = (intent, slots, cekResponse) => {

  return new Promise(async function (resolve, reject) {
    try {
      let resultMessage = '';
      switch (intent) {
        case 'turnOnHue': { // hue 1개를 켜는 부분. 여기서는 테스트 용으로 9번 전구를 켠다
          if (!slots.number) {
            cekResponse.appendSpeechText('조명을 켭니다');
            const data = { on: true };
            const result = await requestData('clova/req/hue/changeStatus/9', JSON.stringify(data));
            cekResponse.appendSpeechText('조명을 켰습니다');
            break;
          } else {
            cekResponse.appendSpeechText(`${slots.number.value} 조명을 켭니다`);

            const index = slots.number.value.split('').findIndex(element => element === '번');
            const id = slots.number.value.split('').slice(0, index).join('');
            const data = { on: true };
            const result = await requestData(`clova/req/hue/changeStatus/${id}`, JSON.stringify(data));
            cekResponse.appendSpeechText(`${slots.number.value} 조명을 켰습니다`);
            break;
          }
        }
        case 'turnOffHue': { // hue 1개를 끄는 부분. 여기서는 테스트 용으로 9번 전구를 끈다
          if (!slots.number) {
            cekResponse.appendSpeechText('조명을 끕니다');
            const data = { on: true };
            const result = await requestData('clova/req/hue/changeStatus/9', JSON.stringify(data));
            cekResponse.appendSpeechText('조명을 껐습니다');
            break;
          } else {
            cekResponse.appendSpeechText(`${slots.number.value} 조명을 끕니다`);

            const index = slots.number.value.split('').findIndex(element => element === '번');
            const id = slots.number.value.split('').slice(0, index).join('');
            const data = { on: false };
            const result = await requestData(`clova/req/hue/changeStatus/${id}`, JSON.stringify(data));
            cekResponse.appendSpeechText(`${slots.number.value} 조명을 껐습니다`);
            break;
          }
        }
        case 'checkRoom': { // 현재 공간을 확인하는 부분. 공간을 확인한 뒤 현재 공간을 응답으로 전달해준다
          cekResponse.appendSpeechText('방을 확인합니다');
          const result = await requestData('clova/req/room');
          cekResponse.appendSpeechText('현재 방은 ' + result.join(', ') + '입니다');
          break;
        }
        case 'checkHue': { // 특정 공간에 있는 hue를 확인하는 부분. 특정 공간에 있는 hue를 파악한 뒤 응답으로 전달해준다
          if (slots.room) {
            cekResponse.appendSpeechText(`${slots.room.value}에 배치된 전구를 확인합니다`);
            const result = await requestData('clova/req/hueAssignInfo', JSON.stringify(slots.room));
            if (result.length === 0) cekResponse.appendSpeechText(`현재 ${slots.room.value}에 배치된 전구는 없습니다`);
            else cekResponse.appendSpeechText(`현재 ${slots.room.value}에 배치된 전구는 ${result.join('번,')}번 입니다`);
            break;
          } else {
            cekResponse.appendSpeechText('방을 인식할 수 없습니다');
            break;
          }
        }
        case 'changeHueRoom': { // 특정 공간에 있는 hue를 제어하는 부분. 특정 공간에 있는 hue를 파악한 뒤 전원을 키거나 끈다 
          if (slots.room) {
            if (slots.turnOn) cekResponse.appendSpeechText(`${slots.room.value}에 있는 전구를 켭니다`);
            else cekResponse.appendSpeechText(`${slots.room.value}에 있는 전구를 끕니다`);

            const query = { room: slots.room, on: slots.turnOn ? true : false }
            const result = await requestData('clova/req/changeHueRoom', JSON.stringify(query));
            if (result.result === 'success') cekResponse.appendSpeechText(`${slots.room.value}에 있는 전구를 ${slots.turnOn ? '켭니다' : '끕니다'}`);
            break;
          } else {
            cekResponse.appendSpeechText('방을 인식할 수 없습니다');
            break;
          }
        }

        case 'Clova.GuideIntent':
        default:
          cekResponse.setSimpleSpeechText("다시 말해주세요")
      }
      resolve(null);
    } catch (e) {
      reject(e)
    }
  })
}

module.exports = {
  doIntentJob, client
}