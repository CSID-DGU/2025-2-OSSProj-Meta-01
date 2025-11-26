import os
from dotenv import load_dotenv

from solapi import SolapiMessageService
from solapi.model import RequestMessage

load_dotenv()

SOLAPI_API_KEY = os.getenv("SOLAPI_API_KEY")
SOLAPI_API_SECRET = os.getenv("SOLAPI_API_SECRET")
SOLAPI_SENDER = os.getenv("SOLAPI_SENDER")


def send_sms(phone: str, text: str) -> dict:
    if not (SOLAPI_API_KEY and SOLAPI_API_SECRET and SOLAPI_SENDER):
        return {"error": "Solapi 환경변수가 설정되지 않았습니다."}

    try:
        message_service = SolapiMessageService(
            api_key=SOLAPI_API_KEY,
            api_secret=SOLAPI_API_SECRET,
        )

        message = RequestMessage(
            from_=SOLAPI_SENDER,
            to=phone,
            text=text,
        )

        response = message_service.send(message)

        group_info = getattr(response, "group_info", None)
        if group_info is None:
            return {"response": str(response)}

        return {
            "group_id": group_info.group_id,
            "total": group_info.count.total,
            "registered_success": group_info.count.registered_success,
            "registered_failed": group_info.count.registered_failed,
        }

    except Exception as e:
        return {"error": str(e)}
