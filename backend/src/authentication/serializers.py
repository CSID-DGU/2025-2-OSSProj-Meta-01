from rest_framework import serializers
from .models import User

class UserSignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'password', 'user_name', 'phone', 'email',
            'major', 'year', 'gpa', 'income_level', 'receive_notifications'
        ]

    def validate(self, data):
        required_fields = ['id', 'password', 'user_name', 'phone', 'email', 'year', 'gpa']
        for field in required_fields:
            if not data.get(field):
                raise serializers.ValidationError({field: '필수 입력 항목입니다.'})
        return data
