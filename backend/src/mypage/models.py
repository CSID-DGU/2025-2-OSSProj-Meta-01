from django.db import models
from authentication.models import User, Major, University


class Organization(models.Model):
    organization_id = models.AutoField(primary_key=True)
    organization_name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'Organizations'


class Scholarship(models.Model):
    scholarship_id = models.AutoField(primary_key=True)
    university = models.ForeignKey(
        University, on_delete=models.SET_NULL, null=True, db_column='university_id'
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, db_column='organization_id'
    )
    scholarship_name = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    url = models.CharField(max_length=500)
    image_url = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'Scholarships'


class Keyword(models.Model):
    keyword_id = models.AutoField(primary_key=True)
    keyword = models.CharField(max_length=50)

    class Meta:
        db_table = 'Keywords'


class UserKeyword(models.Model):
    user_keyword_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    keyword = models.ForeignKey(Keyword, on_delete=models.CASCADE, db_column='keyword_id')

    class Meta:
        db_table = 'UserKeywords'
        unique_together = ('user', 'keyword')


class Bookmark(models.Model):
    bookmark_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    scholarship = models.ForeignKey(Scholarship, on_delete=models.CASCADE, db_column='scholarship_id')

    class Meta:
        db_table = 'Bookmarks'
        unique_together = ('user', 'scholarship')


class Certification(models.Model):
    certification_id = models.AutoField(primary_key=True)
    certification_name = models.CharField(max_length=200, unique=True)
    category = models.CharField(max_length=50)

    class Meta:
        db_table = 'Certifications'


class UserCertification(models.Model):
    user_certification_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    certification = models.ForeignKey(
        Certification, on_delete=models.CASCADE, db_column='certification_id'
    )
    score = models.CharField(max_length=50, null=True, blank=True)
    acquired_date = models.DateField()
    expiration_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'UserCertifications'
        unique_together = ('user', 'certification')
