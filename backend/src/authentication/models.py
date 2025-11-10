from django.db import models
from django.contrib.auth.hashers import make_password

class University(models.Model):
    university_id = models.AutoField(primary_key=True)
    university_name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'Universities'

    def __str__(self):
        return self.university_name

class Major(models.Model):
    major_id = models.AutoField(primary_key=True)
    university = models.ForeignKey(University, on_delete=models.CASCADE)
    major_name = models.CharField(max_length=200)

    class Meta:
        db_table = 'Majors'

    def __str__(self):
        return self.major_name

class User(models.Model):
    YEAR_CHOICES = [(str(i), str(i)) for i in range(1, 7)]
    INCOME_CHOICES = [(f"{i}분위", f"{i}분위") for i in range(1, 11)]

    user_id = models.AutoField(primary_key=True)
    id = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=100)
    user_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=30, unique=True)
    email = models.CharField(max_length=100, unique=True)
    major = models.ForeignKey(Major, on_delete=models.CASCADE)
    year = models.CharField(max_length=1, choices=YEAR_CHOICES)
    gpa = models.DecimalField(max_digits=3, decimal_places=2)
    income_level = models.CharField(max_length=10, choices=INCOME_CHOICES, null=True, blank=True)
    receive_notifications = models.BooleanField(default=False)

    USERNAME_FIELD = 'id'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'Users'

    is_active = True

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False
    
    def save(self, *args, **kwargs):
        
        if not self.password.startswith('pbkdf2_'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.user_name
