from django.core.management.base import BaseCommand
from notification.tasks import run_notification_job

class Command(BaseCommand):
    help = "매일 오전 9시에 실행되는 장학금 알림 스케줄러"

    def handle(self, *args, **options):
        self.stdout.write(">>> 스케줄러 실행 시작")
        run_notification_job()
        self.stdout.write(">>> 스케줄러 실행 완료")
