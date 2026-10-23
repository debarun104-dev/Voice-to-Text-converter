import speech_recognition as sr
import pyttsx3
recognizer=sr.Recognizer()
engine=pyttsx3.init()
with sr.Microphone() as source:
    engine.say("Hello sir, I am a voice to text converter")
    engine.runAndWait()
    print("Listening...")
    audio=recognizer.listen(source)
    try:
        text=recognizer.recognize_google(audio)
        print("You said: ",text)
        engine.say("you said: "+text)
        engine.runAndWait()
    except Exception:
        print("Sorry,Couldn't understand...")
        engine.say("Sorry,Couldn't understand...")
        engine.runAndWait()
