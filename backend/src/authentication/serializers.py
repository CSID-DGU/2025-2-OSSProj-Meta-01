from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework.validators import UniqueValidator
from django.contrib.auth.hashers import check_password
from .models import User, Major
from rest_framework_simplejwt.tokens import RefreshToken, TokenError


class UserSignupSerializer(serializers.ModelSerializer):
    id = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="이미 존재하는 아이디입니다."
            )
        ],
        error_messages={
            "required": "필수 입력 항목입니다.",
            "blank": "필수 입력 항목입니다."
        }
    )

    password = serializers.CharField(
        write_only=True,
        error_messages={
            "required": "필수 입력 항목입니다.",
            "blank": "필수 입력 항목입니다."
        }
    )

    user_name = serializers.CharField(
        error_messages={
            "required": "필수 입력 항목입니다.",
            "blank": "필수 입력 항목입니다."
        }
    )

    phone = serializers.RegexField(
        regex=r"^010\d{8}$",
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="이미 가입된 전화번호입니다."
            )
        ],
        error_messages={
            "required": "필수 입력 항목입니다.",
            "blank": "필수 입력 항목입니다.",
            "invalid": "올바른 전화번호 형식이 아닙니다."
        }
    )

    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="이미 가입된 이메일입니다."
            )
        ],
        error_messages={
            "required": "필수 입력 항목입니다.",
            "blank": "필수 입력 항목입니다.",
            "invalid": "올바른 이메일 형식이 아닙니다."
        }
    )

    major = serializers.PrimaryKeyRelatedField(
        queryset=Major.objects.all(),
        error_messages={
            "required": "필수 입력 항목입니다.",
            "blank": "필수 입력 항목입니다."
        }
    )

    year = serializers.ChoiceField(
        choices=['1','2','3','4','5','6'],
        error_messages={
            "invalid_choice": "올바른 학년 형식이 아닙니다.",
            "required": "필수 입력 항목입니다."
        }
    )

    gpa = serializers.CharField(
        error_messages={
            "required": "필수 입력 항목입니다.",
            "blank": "필수 입력 항목입니다."
        }
    )

    income_level = serializers.ChoiceField(
        choices=['1분위','2분위','3분위','4분위','5분위','6분위','7분위','8분위','9분위','10분위'],
        required=False,
        error_messages={
            "invalid_choice": "올바른 소득분위 형식이 아닙니다.",
        }
    )

    receive_notifications = serializers.BooleanField(required=False)

    def validate_gpa(self, value):
        try:
            number = float(value)
        except:
            raise serializers.ValidationError("올바른 학점 형식이 아닙니다.")

        if number < 0 or number > 4.50:
            raise serializers.ValidationError("올바른 학점 형식이 아닙니다.")

        if "." in value:
            if len(value.split(".")[1]) > 2:
                raise serializers.ValidationError("올바른 학점 형식이 아닙니다.")

        return format(number, ".2f")

    class Meta:
        model = User
        fields = [
            "id", "password", "user_name", "phone", "email",
            "major", "year", "gpa",
            "income_level", "receive_notifications"
        ]

class UserLoginSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate(self, data):
        user_id = data.get("id")
        password = data.get("password")

        if not user_id or not password:
            raise serializers.ValidationError(
                {"error": "아이디와 비밀번호를 모두 입력해주세요."}
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {"error": "존재하지 않는 아이디입니다."}
            )

        if not check_password(password, user.password):
            raise serializers.ValidationError(
                {"error": "비밀번호가 일치하지 않습니다."}
            )

        data["user"] = user
        return data

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        refresh_token = data.get("refresh")

        if not refresh_token:
            raise serializers.ValidationError(
                {"error": "refresh 토큰을 입력해주세요."}
            )

        try:
            token = RefreshToken(refresh_token)
        except TokenError:
            raise serializers.ValidationError(
                {"error": "유효하지 않은 refresh 토큰입니다."}
            )

        data["token"] = token
        return data

    def save(self, **kwargs):
        token = self.validated_data["token"]
        token.blacklist()
