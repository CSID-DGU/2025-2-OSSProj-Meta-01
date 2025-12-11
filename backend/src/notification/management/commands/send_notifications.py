import time
from datetime import datetime
from django.core.management.base import BaseCommand
from notification.tasks import run_notification_job

class Command(BaseCommand):
    help = "매일 정해진 시간에 자동으로 실행되는 SMS 알림 스케줄러"

    def handle(self, *args, **options):
        self.stdout.write(">>> [Scheduler] 스케줄러 실행 시작")

        # UTC 00시 00분 -> KST 09시 00분
        TARGET_HOUR = 0
        TARGET_MINUTE = 00

        last_run_date = None

        while True:
            now = datetime.now()

            if (
                now.hour == TARGET_HOUR
                and now.minute == TARGET_MINUTE
                and last_run_date != now.date()
            ):
                self.stdout.write(">>> [Scheduler] SMS 알림 전송 시작")
                run_notification_job()
                last_run_date = now.date()
                self.stdout.write(">>> [Scheduler] SMS 알림 전송 완료")

                time.sleep(60)

            time.sleep(1)
