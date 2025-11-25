import os
from dotenv import load_dotenv
from solapi import Solapi

load_dotenv()

API_KEY = os.getenv("COOLSMS_API_KEY")
API_SECRET = os.getenv("COOLSMS_API_SECRET")
SENDER = os.getenv("COOLSMS_SENDER")


def send_sms(phone: str, text: str) -> dict:
    if not (API_KEY and API_SECRET and SENDER):
        return {"error": "환경변수(COOLSMS_API_KEY, SECRET, SENDER)가 설정되지 않았습니다."}

    client = Solapi(API_KEY, API_SECRET)

    try:
        response = client.message.send({
            "to": phone,
            "from": SENDER,
            "text": text,
        })
        return response

    except Exception as e:
        return {
            "error": True,
            "message": str(e),
        }
