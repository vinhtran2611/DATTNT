// import logo from './logo.svg';
import React from 'react';
import './App.css';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import config from './config.json'
import Paho from "paho-mqtt"
import axios from "axios"
import LED_ON from './pic/led_on.png'
import LED_OFF from './pic/led_off.png'
import DOOR_OPEN from './pic/door_open.png'
import DOOR_CLOSE from './pic/door_close.png'

function App() {
  const [gas, setGas] = React.useState()
  const [humi, setHumi] = React.useState()
  const [temp, setTemp] = React.useState()
  const [led_on_1, set_ledon_1] = React.useState(false)
  const [door_open_1, set_dooropen_1] = React.useState(false)

  React.useEffect(() => {
    axios
      .get(
        `https://io.adafruit.com/api/v2/${config.USER_NAME}/feeds/${config.FEED_GAS_KEY}/data?limit=10`,
        {
          headers: {
            "x-aio-key": config.ADAFRUIT_KEY,
          },
        }
      )
      .then((res) => {
        if (res.data) {

          const points = res.data.map(
            (temp) => {
              const date = new Date(temp.created_at)
              return {
                name: `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`,
                value: temp.value
              }
            })
          console.log(res.data)
          setGas(points.reverse())

        }
      })

    axios
      .get(
        `https://io.adafruit.com/api/v2/${config.USER_NAME}/feeds/${config.FEED_HUMI_KEY}/data?limit=10`,
        {
          headers: {
            "x-aio-key": config.ADAFRUIT_KEY,
          },
        }
      )
      .then((res) => {
        if (res.data) {

          const points = res.data.map(
            (temp) => {
              const date = new Date(temp.created_at)
              return {
                name: `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`,
                value: temp.value
              }
            })
          console.log(res.data)
          setHumi(points.reverse())

        }
      })

    axios
      .get(
        `https://io.adafruit.com/api/v2/${config.USER_NAME}/feeds/${config.FEED_TEMP_KEY}/data?limit=10`,
        {
          headers: {
            "x-aio-key": config.ADAFRUIT_KEY,
          },
        }
      )
      .then((res) => {
        if (res.data) {

          const points = res.data.map(
            (temp) => {
              const date = new Date(temp.created_at)
              return {
                name: `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`,
                value: temp.value
              }
            })
          console.log(res.data)
          setTemp(points.reverse())

        }
      })

    axios
      .get(
        `https://io.adafruit.com/api/v2/${config.USER_NAME}/feeds/${config.FEED_DOOR_KEY}/data?limit=1`,
        {
          headers: {
            "x-aio-key": config.ADAFRUIT_KEY,
          },
        }
      )
      .then((res) => {
          console.log(res.data[0].value)
          set_dooropen_1(res.data[0].value === "DOOR_OPEN")
        }
      )

    axios
      .get(
        `https://io.adafruit.com/api/v2/${config.USER_NAME}/feeds/${config.FEED_LED_KEY}/data?limit=1`,
        {
          headers: {
            "x-aio-key": config.ADAFRUIT_KEY,
          },
        }
      )
      .then((res) => {
          console.log(res.data[0].value)
          set_ledon_1(res.data[0].value === "LED_ON")
        }
      )

  }, [])

  const AIO_FEED_IDS = [config.FEED_GAS_KEY, config.FEED_HUMI_KEY, config.FEED_TEMP_KEY, config.FEED_DOOR_KEY, config.FEED_LED_KEY]

  // Create a client instance
  var client = new Paho.Client(
    "io.adafruit.com",
    Number(443),
    "abcdefgh"
  )

  // set callback handlers
  client.onConnectionLost = onConnectionLost
  client.onMessageArrived = onMessageArrived
  // connect the client
  client.connect({
    userName: config.USER_NAME,
    password: config.ADAFRUIT_KEY,
    onSuccess: onConnect,
    useSSL: true,
  })

  // called when the client connects
  function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect")
    AIO_FEED_IDS.forEach((id) => {
      client.subscribe(`${config.USER_NAME}/feeds/` + id, { onSuccess: onSubscribe })
    })
  }

  function onSubscribe() {
    console.log("Subscribe success!")
  }

  // called when the client loses its connection
  function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
      console.log("onConnectionLost:" + responseObject.errorMessage)
    }
  }

  // called when a message arrives
  function onMessageArrived(message) {
    console.log("onMessageArrived:" + message.payloadString)
    console.log("feed: " + message.destinationName)
    if (message.destinationName === `${config.USER_NAME}/feeds/${config.FEED_GAS_KEY}`) {
      const date = new Date()
      const tempOb = {
        name: `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`,
        value: Number(message.payloadString)
      }
      setGas([...gas, tempOb])
    }
    else if (message.destinationName === `${config.USER_NAME}/feeds/${config.FEED_HUMI_KEY}`) {
      const date = new Date()
      const tempOb = {
        name: `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`,
        value: Number(message.payloadString)
      }
      setHumi([...humi, tempOb])
    }

    else if (message.destinationName === `${config.USER_NAME}/feeds/${config.FEED_TEMP_KEY}`) {
      const date = new Date()
      const tempOb = {
        name: `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`,
        value: Number(message.payloadString)
      }
      setTemp([...temp, tempOb])
    }

    else if (message.destinationName === `${config.USER_NAME}/feeds/${config.FEED_DOOR_KEY}`) {
      set_dooropen_1(message.payloadString === "DOOR_OPEN")
    }

    else if (message.destinationName === `${config.USER_NAME}/feeds/${config.FEED_LED_KEY}`) {
      set_ledon_1(message.payloadString === "LED_ON")
    }
  }

  const openDoor = () => {
    var message = new Paho.Message("DOOR_OPEN");
    message.destinationName = `${config.USER_NAME}/feeds/${config.FEED_DOOR_KEY}`;
    client.send(message);
  }

  const closeDoor = () => {
    var message = new Paho.Message("DOOR_CLOSE");
    message.destinationName = `${config.USER_NAME}/feeds/${config.FEED_DOOR_KEY}`;
    client.send(message);
  }

  const openLED = () => {
    console.log("SEND...");
    var message = new Paho.Message("LED_ON");
    message.destinationName = `${config.USER_NAME}/feeds/${config.FEED_LED_KEY}`;
    client.send(message);
    console.log("DONE");
  }

  const closeLED = () => {
    var message = new Paho.Message("LED_OFF");
    message.destinationName = `${config.USER_NAME}/feeds/${config.FEED_LED_KEY}`;
    client.send(message);
  }

  const renderLineGasChart = (
    <LineChart width={400} height={300} data={gas}>
      <Line type="monotone" dataKey="value" stroke="#8884d8" />
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
    </LineChart>
  );

  const renderLineHumiChart = (
    <LineChart width={400} height={300} data={humi}>
      <Line type="monotone" dataKey="value" stroke="#8884d8" />
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
    </LineChart>
  );

  const renderLineTempChart = (
    <LineChart width={400} height={300} data={temp}>
      <Line type="monotone" dataKey="value" stroke="#8884d8" />
      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
    </LineChart>
  );

  return (
    <div className="App d-flex align-items-center flex-column">
      <div className = "App d-flex justify-content-between flex-row">
        <div className='border border-3 border-warning m-5' style={{minWidth: "300px"}} >
          <div className='text-warning'>
            <h2>DOOR #1</h2>
          </div>
          {
            door_open_1?
            <img src={DOOR_OPEN}/>
            :
            <img src={DOOR_CLOSE}/>
          }
          <div className=''>
            <button className='btn btn-primary m-2' onClick={() => {openDoor();}}>OPEN</button>
            <button className='btn btn-danger m-2' onClick={() => {closeDoor();}}>CLOSE</button>
          </div>
        </div>
        <div className='border border-3 border-success m-5' style={{minWidth: "300px"}} >
          <div className='text-success'>
            <h2>LED #1</h2>
          </div>
          {
            led_on_1?
            <img src={LED_ON}/>
            :
            <img src={LED_OFF}/>
          }
          <div className=''>
            <button className='btn btn-primary m-2' onClick={() => {openLED();}}>TURN ON</button>
            <button className='btn btn-danger m-2' onClick={() => {closeLED();}}>TURN OFF</button>
          </div>
        </div>
      </div>

      <div className='text-danger'>
        <h1>CHART</h1>
      </div>
      <div className = "App d-flex justify-content-between flex-row w-100">
        <div className='border border-3 border-danger m-2'>
          <div className='text-danger'>
            <h2>Gas Chart</h2>
          </div>
          <div>
            {renderLineGasChart}
          </div>
        </div>
        <div className='border border-3 border-danger m-2'>
          <div className='text-danger'>
            <h2>Humidity Chart</h2>
          </div>
          <div>
            {renderLineHumiChart}
          </div>
        </div>
        <div className='border border-3 border-danger m-2'>
          <div className='text-danger'>
            <h2>Temperature Chart</h2>
          </div>
          <div>
            {renderLineTempChart}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
