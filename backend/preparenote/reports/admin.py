from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["note", "reporter", "reason", "created_at"]
    search_fields = ["reason", "reporter__username", "note__title"]
