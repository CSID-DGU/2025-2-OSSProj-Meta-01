from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.hashers import check_password
from authentication.models import User, Major
from .models import (
    Keyword, UserKeyword,
    Certification, UserCertification,
    Scholarship, Bookmark
)

# 1. 사용자 개인정보
class UserInfoSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source='major.university.university_name', read_only=True)
    major_name = serializers.CharField(source='major.major_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'user_name',
            'phone',
            'email',
            'university_name',
            'major_name',
            'year',
            'gpa',
            'income_level',
            'receive_notifications',
        ]

class UserUpdateSerializer(serializers.ModelSerializer):

    old_password = serializers.CharField(write_only=True, required=False)
    new_password1 = serializers.CharField(write_only=True, required=False)
    new_password2 = serializers.CharField(write_only=True, required=False)

    phone = serializers.RegexField(
        regex=r"^010\d{8}$",
        required=False,
        allow_blank=False,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="이미 가입된 전화번호입니다."
            )
        ],
        error_messages={
            "required": "전화번호는 필수 입력 항목입니다.",
            "blank": "전화번호는 필수 입력 항목입니다.",
            "invalid": "올바른 전화번호 형식이 아닙니다."
        }
    )

    email = serializers.EmailField(
        required=False,
        allow_blank=False,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="이미 가입된 이메일입니다."
            )
        ],
        error_messages={
            "required": "이메일은 필수 입력 항목입니다.",
            "blank": "이메일은 필수 입력 항목입니다.",
            "invalid": "올바른 이메일 형식이 아닙니다."
        }
    )

    major = serializers.PrimaryKeyRelatedField(
        queryset=Major.objects.all(),
        required=False,
        error_messages={
            "invalid": "올바른 전공 형식이 아닙니다."
        }
    )

    year = serializers.ChoiceField(
        choices=['1', '2', '3', '4', '5', '6'],
        required=False,
        error_messages={
            "invalid_choice": "올바른 학년 형식이 아닙니다.",
        }
    )

    gpa = serializers.CharField(
        required=False,
        error_messages={
            "required": "학점은 필수 입력 항목입니다.",
            "blank": "학점은 필수 입력 항목입니다."
        }
    )

    income_level = serializers.ChoiceField(
        choices=[
            '1분위', '2분위', '3분위', '4분위', '5분위',
            '6분위', '7분위', '8분위', '9분위', '10분위'
        ],
        required=False,
        error_messages={
            "invalid_choice": "올바른 소득분위 형식이 아닙니다.",
        }
    )

    receive_notifications = serializers.BooleanField(required=False)

    def validate_gpa(self, value):
        if value == "":
            raise serializers.ValidationError("학점은 필수 입력 항목입니다.")

        try:
            number = float(value)
        except:
            raise serializers.ValidationError("올바른 학점 형식이 아닙니다.")

        if number < 0 or number > 4.50:
            raise serializers.ValidationError("올바른 학점 형식이 아닙니다.")

        if "." in value and len(value.split(".")[1]) > 2:
            raise serializers.ValidationError("올바른 학점 형식이 아닙니다.")

        return format(number, ".2f")

    class Meta:
        model = User
        fields = [
            'old_password',
            'new_password1',
            'new_password2',
            'password',
            'phone',
            'email',
            'major',
            'year',
            'gpa',
            'income_level',
            'receive_notifications',
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
        }

    def validate(self, attrs):

        ignore_fields = [
            "phone", "email", "major", "year",
            "gpa", "income_level", "receive_notifications"
        ]

        for field in ignore_fields:
            if field in attrs and attrs[field] == "":
                attrs.pop(field)

        old_password = attrs.get("old_password")
        new_password1 = attrs.get("new_password1")
        new_password2 = attrs.get("new_password2")

        if old_password or new_password1 or new_password2:

            if not old_password or not new_password1 or not new_password2:
                raise serializers.ValidationError(
                    {"error": "비밀번호 변경을 위해 기존 비밀번호와 새로운 비밀번호를 모두 입력해주세요."}
                )

            user = self.instance
            if not check_password(old_password, user.password):
                raise serializers.ValidationError(
                    {"old_password": "기존 비밀번호가 일치하지 않습니다."}
                )

            if new_password1 != new_password2:
                raise serializers.ValidationError(
                    {"new_password2": "새로운 비밀번호가 일치하지 않습니다."}
                )

            attrs["password"] = new_password1

        return attrs

    def update(self, instance, validated_data):

        password = validated_data.pop("password", None)
        if password:
            instance.password = password

        major = validated_data.pop("major", None)
        if major is not None:
            instance.major = major

        validated_data.pop("old_password", None)
        validated_data.pop("new_password1", None)
        validated_data.pop("new_password2", None)

        return super().update(instance, validated_data)

# 2. 관심 키워드
class KeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Keyword
        fields = ['keyword_id', 'keyword']


class UserKeywordSerializer(serializers.ModelSerializer):
    keyword = KeywordSerializer(read_only=True)
    keyword_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = UserKeyword
        fields = [
            'user_keyword_id',
            'keyword',
            'keyword_id',
        ]

# 3. 자격증
class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ['certification_id', 'certification_name', 'category']


class UserCertificationSerializer(serializers.ModelSerializer):
    certification = CertificationSerializer(read_only=True)
    certification_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = UserCertification
        fields = [
            'user_certification_id',
            'certification',
            'certification_id',
            'score',
            'acquired_date',
            'expiration_date',
        ]

# 4. 북마크
class BookmarkSerializer(serializers.ModelSerializer):
    scholarship_name = serializers.CharField(source='scholarship.scholarship_name', read_only=True)
    start_date = serializers.DateField(source='scholarship.start_date', read_only=True)
    end_date = serializers.DateField(source='scholarship.end_date', read_only=True)

    class Meta:
        model = Bookmark
        fields = [
            'bookmark_id',
            'scholarship_name',
            'start_date',
            'end_date',
        ]
