from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserSignupSerializer, UserLoginSerializer, LogoutSerializer


class SignupView(APIView):
    def post(self, request):
        serializer = UserSignupSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': '회원가입이 완료되었습니다.'}, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        return Response({
            "message": f"{user.user_name}님 환영합니다.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer.save()
        return Response(
            {"message": "로그아웃이 완료되었습니다."},
            status=status.HTTP_205_RESET_CONTENT
        )
