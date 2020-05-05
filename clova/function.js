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

  function requestData(pubTopic, pubMessage) {
    return new Promise((resolve, reject) => {
      try {
        client.publish(pubTopic, pubMessage, {}, () => {
          client.on("message", (subTopic, subMessage) => {
            if (
              pubTopic.split("/").splice(1).join("") ===
              subTopic.split("/").splice(1).join("")
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

const changeBulbState = async (value) => {
    // console.log(value);
    try {
        // const on = await getBulbState();
        // console.log(on);
        let queueName = 'req/hue/light';
        const rq = new RabbitmqWrapper(url, queueName);
        
        await rq.sendMessage(value === 'on' ? 'on' : 'off');
        
        // return on.on;
        // return new Promise(function(resolve, reject){
        //     try{
        //         resolve(on.on);
        //     }catch(e){
        //         reject(e);
        //     }
        // })
    } catch (e) {
        console.error(e);
    }
    
};

async function getHueStatus(){
    client.publish('req/hue/status')
}

const getSpecificWeatherData = async (type) => {
    const dataType = new Map([
        ['temperature', 'T3H'],
        ['sky', 'SKY'],
        ['humidity', 'REH'],
        ['rain', 'PTY'],
        ['rainProbability', 'POP'],
        ['windDirection', 'VEC'],
        ['windSpeed', 'WSD']
        ]);
    try{
        const weatherData = await getWeatherData();
        const result = weatherData.filter(element=>element['category'] === type);
        console.log(result[0]);
        return result[0];
    }catch(e){
        console.log(e);
    }   
}


const getWeatherData = async () => {
    try{
        let queueName = 'req/weather/info/general';
        let rq = new RabbitmqWrapper(url, queueName);
        await rq.sendMessage('');

        queueName = 'res/weather/info/general';
        rq = new RabbitmqWrapper(url, queueName);
        const result = await rq.recvMessage('json');
        return result;
    }catch(e){
        console.log(e);
    }
}

const doIntentJob = (intent, cekResponse) => {
    return new Promise(async function(resolve, reject){
        try{
            let resultMessage = '';
            switch (intent) {
                case 'turnOnHue':
                    cekResponse.appendSpeechText('조명을 켭니다');
                    const data = {on: true};
                    const result = await requestData('clova/req/hue/changeStatus/9', JSON.stringify(data));
                    cekResponse.appendSpeechText('조명을 켰습니다');
                    break;
                case 'turnOffHue':
                    cekResponse.appendSpeechText('조명을 끕니다');
                    const data = {on: false};
                    const result = await requestData('clova/req/hue/changeStatus/9', JSON.stringify(data));
                    cekResponse.appendSpeechText('조명을 껐습니다');
                    break;
                case 'checkStatusHue':
                  cekResponse.appendSpeechText('조명을 확인합니다');
                  const result = await requestData('clova/req/hue/status')
                  resultMessage = result[0].on ? '현재 조명은 켜졌습니다' : '현재 조명은 꺼졌습니다';
                  cekResponse.appendSpeechText(resultMessage);
                  break;
                case 'checkTemperature': 
                    cekResponse.appendSpeechText('온도를 확인합니다');
                    const temperatureResult = await getSpecificWeatherData('T3H');
                    cekResponse.appendSpeechText(`온도는 ${temperatureResult.fcstValue}도 입니다`);
                    break;
                case 'checkSky': 
                    cekResponse.appendSpeechText('하늘 상태를 확인합니다');
                    const skyResult = await getSpecificWeatherData('SKY'); 
                    switch(skyResult.fcstValue){
                        case '1': resultMessage = '하늘 상태는 맑습니다'; break;
                        case '3': resultMessage = '하늘 상태는 구름이 많습니다'; break;
                        case '4': resultMessage = '하늘 상태는 흐립니다'; break;
                    }
                    cekResponse.appendSpeechText(resultMessage);
                    break;
                case 'checkHumidity':
                    cekResponse.appendSpeechText('습도를 확인합니다');
                    const humidityResult = await getSpecificWeatherData('REH'); 
                    resultMessage = `현재 습도는 ${humidityResult.fcstValue}도 입니다`
                    cekResponse.appendSpeechText(resultMessage);
                    break;
                case 'checkRain':
                    cekResponse.appendSpeechText('강수량을 확인합니다');
                    const rainResult = await getSpecificWeatherData('PTY'); 
                    const rainProbaility = await getSpecificWeatherData('POP');
                    resultMessage = `현재 강수량은 ${rainResult.fcstValue}입니다`
                    cekResponse.appendSpeechText(resultMessage);
                    break;
                case 'checkWind':
                    cekResponse.appendSpeechText('바람을 확인합니다');
                    const westOrEast = await getSpecificWeatherData('UUU').fcstValue; 
                    const northOrSouth = await getSpecificWeatherData('VVV').fcstValue; 
                    const windSpeed = await getSpecificWeatherData('WSD'); 

                    let currentWindDirection = westOrEast < 0 ? '서풍' : '동풍';
                    currentWindDirection += ', ';
                    currentWindDirection += northOrSouth < 0 ? '남풍' : '북풍';

                    resultMessage = `현재 풍속은 초속 ${windSpeed.fcstValue} 미터 입니다 `
                    resultMessage += `현재 풍향은 ${currentWindDirection} 입니다`
                    cekResponse.appendSpeechText(resultMessage);
                    break;
                case 'Clova.GuideIntent':
                default:
                  cekResponse.setSimpleSpeechText("다시 말해주세요")
              }
              resolve(null);
        }catch(e){
            reject(e)
        }
    })
}

module.exports = {
    changeBulbState, getWeatherData, getBulbState, doIntentJob, client
}