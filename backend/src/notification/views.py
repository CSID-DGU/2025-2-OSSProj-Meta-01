from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from datetime import datetime, time, timedelta
from django.utils import timezone

from mypage.exceptions import CustomExceptionHandlerMixin
from mypage.models import Bookmark
from .models import Notification
from .serializers import (
    CalendarSerializer,
    NotificationSerializer,
    NotificationCreateSerializer,
)

class MyCalendarView(CustomExceptionHandlerMixin, generics.ListAPIView):

    serializer_class = CalendarSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Bookmark.objects
            .filter(user=self.request.user)
            .select_related("scholarship")
        )

class MyNotificationListView(CustomExceptionHandlerMixin, generics.ListAPIView):

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        bookmark_id = self.kwargs.get("bookmark_id")

        return (
            Notification.objects
            .filter(
                bookmark__bookmark_id=bookmark_id,
                bookmark__user=self.request.user,
            )
            .select_related("bookmark__scholarship")
            .order_by("notification_date")
        )

class MyNotificationCreateView(CustomExceptionHandlerMixin, APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, bookmark_id):

        try:
            bookmark = (
                Bookmark.objects
                .select_related("scholarship")
                .get(
                    bookmark_id=bookmark_id,
                    user=request.user
                )
            )
        except Bookmark.DoesNotExist:
            return Response(
                {"error": "존재하지 않는 북마크입니다."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = NotificationCreateSerializer(
            data=request.data,
            context={"bookmark": bookmark}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        updated = (
            Notification.objects
            .filter(bookmark=bookmark)
            .select_related("bookmark__scholarship")
            .order_by("notification_date")
        )
        updated_data = NotificationSerializer(updated, many=True).data

        return Response(
            {
                "message": "알림이 추가되었습니다.",
                "notifications": updated_data,
            },
            status=status.HTTP_200_OK
        )

class MyNotificationDeleteView(CustomExceptionHandlerMixin, APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):

        try:
            notification = (
                Notification.objects
                .select_related("bookmark__scholarship")
                .get(
                    notification_id=notification_id,
                    bookmark__user=request.user
                )
            )
        except Notification.DoesNotExist:
            return Response(
                {"error": "존재하지 않는 알림입니다."},
                status=status.HTTP_404_NOT_FOUND
            )

        bookmark = notification.bookmark

        notification.delete()

        updated = (
            Notification.objects
            .filter(bookmark=bookmark)
            .select_related("bookmark__scholarship")
            .order_by("notification_date")
        )
        updated_data = NotificationSerializer(updated, many=True).data

        return Response(
            {
                "message": "알림이 삭제되었습니다.",
                "notifications": updated_data,
            },
            status=status.HTTP_200_OK
        )

class MyNotificationCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        now = timezone.localtime()

        notifications = (
            Notification.objects
            .select_related("bookmark__scholarship")
            .filter(bookmark__user=request.user)
        )

        count = 0

        for n in notifications:
            scholarship = n.bookmark.scholarship

            send_date = scholarship.end_date - timedelta(days=n.notification_date)

            send_datetime = timezone.make_aware(
                datetime.combine(send_date, time(hour=9, minute=0)),
                timezone.get_current_timezone()
            )

            if now < send_datetime:
                count += 1

        return Response({"count": count}, status=200)
    