import serial
import time
import sys
from Adafruit_IO import MQTTClient
from keras.models import load_model
from PIL import Image, ImageOps
import numpy as np
import cv2
import os
import threading 
import glob
import speech_recognition as sr
# # import mysql.connector

# '''
# mydb = mysql.connector.connect(
#   host="localhost",
#   user="yourusername",
#   password="yourpassword",
#   database="mydatabase"
# )
# '''

AIO_FEED_ID = ["door1", "gas", "humidity", "led1", "temperature"]
AIO_USERNAME = "vinhtran2611"
AIO_KEY = "aio_kFvp14Zc6GUgzfCnaMBDRF6hhAmB"



def connected(client):
    print("Ket noi thanh cong ...")
    for feed in AIO_FEED_ID:
        client.subscribe(feed) 

def subscribe(client, userdata, mid, granted_qos):
    print("Subscribe thanh cong ...")


def disconnected(client):
    print("Ngat ket noi ...")
    sys.exit(1)


def message(client, feed_id, payload):
    print("Nhan du lieu: " + payload)
    if payload == "LED_ON":
        if isMicrobitConnected:
            ser.write(str("#LED_ON*").encode())
    if payload == "LED_OFF":
        if isMicrobitConnected:
            ser.write(str("#LED_OFF*").encode())
    if payload == "DOOR_OPEN":
        if isMicrobitConnected:
            ser.write(str("#DOOR_OPEN*").encode())
    if payload == "DOOR_CLOSE":
        if isMicrobitConnected:
            ser.write(str("#DOOR_CLOSE*").encode())
    

#def on_message(client, userdata, msg, retain):
    #print('Received on {0}: {1}'.format(msg.topic, msg.payload.decode('utf-8')))

client = MQTTClient(AIO_USERNAME, AIO_KEY)
client.on_connect = connected
client.on_disconnect = disconnected
client.on_message = message
client.on_subscribe = subscribe
client.connect()
client.loop_background()


def getPort():
    ports = serial.tools.list_ports.comports()
    N = len(ports)
    commPort = "None"
    for i in range(0, N):
        port = ports[i]
        strPort = str(port)
        if "USB Serial Device" in strPort:
            splitPort = strPort.split(" ")
            commPort = (splitPort[0])
    return commPort

status=0

def processData(data):
    global status
    data = data.replace("*", "")
    data = data.replace("#", "")
    splitData = data.split(":")
    print(splitData[1])
    if splitData[0] == "temp":
        client.publish(AIO_FEED_ID[4], int(splitData[1]))
        

    if splitData[0] == "led":
        client.publish(AIO_FEED_ID[3], int(splitData[1]))
        
    if splitData[0] == "humi":
        client.publish(AIO_FEED_ID[2], int(splitData[1]))
        
    if splitData[0] == "gas":
        client.publish(AIO_FEED_ID[1], int(splitData[1]))
        
    if splitData[0] == "door":
        if splitData[1]=='1':
            status=1
            client.publish(AIO_FEED_ID[0], int(splitData[1]))
            
        if splitData[1]=='0':
            status=0
            client.publish(AIO_FEED_ID[0], int(splitData[1]))
            
        
 

mess = ""
def readSerial():
    bytesToRead = ser.inWaiting()
    if(bytesToRead > 0):
        global mess
        mess =  ser.read(bytesToRead).decode("UTF-8")
        print(mess)
        while ("*" in mess) and ("#" in mess):
            start = mess.find("*")
            end = mess.find("#")
            processData(mess[start:end + 1])
            if(end == len(mess)):
                mess = ""
            else:
                mess = mess[end + 1:]


isMicrobitConnected = False
if getPort() != "None":
    ser = serial.Serial(port=getPort(), baudrate=115200)
    isMicrobitConnected = True

##face recognition
#find highest element of array
def highest(array):
    max=0
    i=0
    count=0
    for element in array[0]:
        if element>max:
            max=element
            i=count
        count+=1
    return i,max
def face_recognition():
    cap=cv2.VideoCapture(0)
    count=0
# Load the model
    model = load_model('keras_model.h5')
# Create the array of the right shape to feed into the keras model
# The 'length' or number of images you can put into the array is
# determined by the first position in the shape tuple, in this case 1.
    data = np.ndarray(shape=(1, 224, 224, 3), dtype=np.float32)
    while True:
        ret,frame=cap.read()
        cv2.imshow('frame',frame)
        k=cv2.waitKey(1)
        if k%256==27:
            break
        path=os.getcwd()
        newpath= path+'\\image'
        if not os.path.exists(newpath):
            os.makedirs(newpath)
        file=newpath+'/Image'+str(count)+'.jpg'
        cv2.imwrite(file,frame)    
        image = Image.open(newpath+'/Image'+str(count)+'.jpg')
    #resize the image to a 224x224 with the same strategy as in TM2:
    #resizing the image to be at least 224x224 and then cropping from the center
        size = (224, 224)
        image = ImageOps.fit(image, size, Image.ANTIALIAS)
    #turn the image into a numpy array
        image_array = np.asarray(image)
    # Normalize the image
        normalized_image_array = (image_array.astype(np.float32) / 127.0) - 1
    # Load the image into the array
        data[0] = normalized_image_array
    # run the inference
        prediction = model.predict(data)
        print(prediction)
        i,max=highest(prediction)
        if i==3 and max>0.7:
            global status
            if status==0 :
                ser.write(bytes("#DOOR_OPEN*", 'UTF-8'))
                #client.publish("bbc-door", 1)
                print('door opened')
        count=count+1
        if count>=5:
            files = glob.glob(newpath+'/Image')
            for f in files:
                os.remove(f) 
            count=0
        time.sleep(1)
    cap.release()
    cv2.destroyAllWindows()

def speech_recognition():
    while True:
        try:
            listener=sr.Recognizer()
            listener.pause_threshold = 0.8
            with sr.Microphone() as source:
                recognized=0
                #adjust energy_threshold
                listener.adjust_for_ambient_noise(source, duration = 1)
                #listening
                print('listening')
                voice=listener.listen(source,phrase_time_limit=3)
                #analyzing
                print('analyzing')
                command=listener.recognize_google(voice)
                command=command.lower()
                print(command)
                #controlling the LED
                if 'squid game' in command:
                    if 'lights' in command or 'light' in command:
                        if 'on' in command:
                            ser.write(bytes("#LED_ON*", 'UTF-8'))
                            recognized=1
                        elif 'off' in command:
                            ser.write(bytes("#LED_OFF*", 'UTF-8'))
                            recognized=1
                    if recognized==0:
                        command=listener.recognize_google(voice,language='vi-VI')
                        command=command.lower()
                        print(command)
                        if 'đèn' in command :
                            if 'mở'  in command or 'bật' in command:
                                ser.write(bytes("#LED_ON*", 'UTF-8'))
                            elif 'tắt' in command:
                                ser.write(bytes("#LED_OFF*", 'UTF-8')) 
        except:
            print('Please try again!')

         
def gateway_run():
    while True:
        if isMicrobitConnected:
            readSerial()
        time.sleep(1)
    

threading.Thread(target=gateway_run).start()
# threading.Thread(target=face_recognition).start()
threading.Thread(target=speech_recognition).start()
