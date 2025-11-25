from django.urls import path
from .views import (
    MyCalendarView,
    MyNotificationCreateView,
    MyNotificationDeleteView,
)

app_name = "notification"

urlpatterns = [
    path("users/<user_id>/calendar/", MyCalendarView.as_view(), name="my-calendar"),

    path("bookmarks/<int:bookmark_id>/notifications/", MyNotificationCreateView.as_view(), name="my-notification-list-create"),
    path("notifications/<int:notification_id>/", MyNotificationDeleteView.as_view(), name="my-notification-delete"),
]
