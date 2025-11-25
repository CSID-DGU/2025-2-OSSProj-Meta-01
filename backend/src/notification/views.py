from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

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
        return Bookmark.objects.filter(user=self.request.user).select_related("scholarship")

class MyNotificationCreateView(CustomExceptionHandlerMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get_bookmark(self, request, bookmark_id):
        try:
            bookmark = Bookmark.objects.get(
                bookmark_id=bookmark_id,
                user=request.user
            )
        except Bookmark.DoesNotExist:
            return None, Response(
                {"error": "존재하지 않는 북마크입니다."},
                status=status.HTTP_404_NOT_FOUND
            )
        return bookmark, None

    def get(self, request, bookmark_id):
        bookmark, error_response = self.get_bookmark(request, bookmark_id)
        if error_response:
            return error_response

        notifications = Notification.objects.filter(
            bookmark=bookmark
        ).order_by("notification_date")

        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, bookmark_id):
        bookmark, error_response = self.get_bookmark(request, bookmark_id)
        if error_response:
            return error_response

        serializer = NotificationCreateSerializer(
            data=request.data,
            context={"bookmark": bookmark}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        updated = Notification.objects.filter(
            bookmark=bookmark
        ).order_by("notification_date")
        updated_data = NotificationSerializer(updated, many=True).data

        return Response({
            "message": "알림이 추가되었습니다.",
            "notifications": updated_data
        }, status=status.HTTP_200_OK)


class MyNotificationDeleteView(CustomExceptionHandlerMixin, APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):
        try:
            notification = Notification.objects.select_related(
                "bookmark"
            ).get(
                notification_id=notification_id,
                bookmark__user=request.user
            )
        except Notification.DoesNotExist:
            return Response(
                {"error": "존재하지 않는 알림입니다."},
                status=status.HTTP_404_NOT_FOUND
            )

        bookmark = notification.bookmark
        notification.delete()

        updated = Notification.objects.filter(
            bookmark=bookmark
        ).order_by("notification_date")
        updated_data = NotificationSerializer(updated, many=True).data

        return Response({
            "message": "알림이 삭제되었습니다.",
            "notifications": updated_data
        }, status=status.HTTP_200_OK)
