from django.urls import path
from .views import (
    MyCalendarView,
    MyNotificationListView,
    MyNotificationCreateView,
    MyNotificationDeleteView,
)

app_name = "notification"

urlpatterns = [
    path("calendar/", MyCalendarView.as_view(), name="my_calendar"),

    path("bookmarks/<int:bookmark_id>/notifications/", MyNotificationListView.as_view(), name="my_notifications"),
    path("bookmarks/<int:bookmark_id>/notifications/add/", MyNotificationCreateView.as_view(), name="add_my_notification"),
    path("notifications/<int:notification_id>/", MyNotificationDeleteView.as_view(), name="delete_my_notification"),
]
