from datetime import date, timedelta

from mypage.models import Bookmark
from .models import Notification
from .services import send_sms


def run_notification_job():
    today = date.today()
    bookmarks = Bookmark.objects.select_related("scholarship", "user")

    for bookmark in bookmarks:
        user = bookmark.user
        scholarship = bookmark.scholarship

        if not user.receive_notifications:
            continue

        end_date = scholarship.end_date

        if end_date < today:
            continue

        if end_date - timedelta(days=1) == today:
            text = (
                f"[장학금 알림]\n"
                f"'{scholarship.scholarship_name}' 장학금 마감이 내일입니다.\n"
                f"(마감일: {end_date})"
            )
            send_sms(user.phone, text)

    notifications = Notification.objects.select_related(
        "bookmark__scholarship",
        "bookmark__user",
    )

    for noti in notifications:
        bookmark = noti.bookmark
        user = bookmark.user
        scholarship = bookmark.scholarship
        d = noti.notification_date

        if not user.receive_notifications:
            continue

        end_date = scholarship.end_date

        if end_date < today:
            continue

        notify_day = end_date - timedelta(days=d)

        if notify_day == today:
            text = (
                f"[장학금 알림]\n"
                f"'{scholarship.scholarship_name}' 장학금 마감이 "
                f"D-{d}입니다.\n"
                f"(마감일: {end_date})"
            )
            send_sms(user.phone, text)
