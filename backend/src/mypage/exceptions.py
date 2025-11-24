from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

class CustomExceptionHandlerMixin:
    def handle_exception(self, exc):
        response = super().handle_exception(exc)

        if response is None:
            return Response(
                {"error": "처리 중 알 수 없는 오류가 발생했습니다."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        if response.status_code == 400:

            original_errors = response.data

            response.data = {
                "error": "잘못된 요청입니다.",
                "details": original_errors
            }

            return response

        elif response.status_code == 401:
            response.data = {"error": "로그인이 필요합니다."}

        elif response.status_code == 403:
            response.data = {"error": "접근 권한이 없습니다."}

        elif response.status_code == 404:
            response.data = {"error": "요청한 데이터를 찾을 수 없습니다."}

        return response
