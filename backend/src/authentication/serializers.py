from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'password', 'user_name', 'phone', 'email',
            'major', 'year', 'gpa', 'income_level', 'receive_notifications'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, data):
        required_fields = ['id', 'password', 'user_name', 'phone', 'email', 'year', 'gpa']
        for field in required_fields:
            if not data.get(field):
                raise serializers.ValidationError({field: '필수 입력 항목입니다.'})
        return data


class UserLoginSerializer(serializers.Serializer):
    id = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        id = data.get('id')
        password = data.get('password')

        if not id or not password:
            raise serializers.ValidationError("아이디와 비밀번호를 모두 입력해주세요.")

        user = authenticate(username=id, password=password)
        if not user:
            raise serializers.ValidationError("아이디 또는 비밀번호가 올바르지 않습니다.")

        data['user'] = user
        return data
