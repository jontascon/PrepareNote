from django.contrib import admin

from .models import Exam, Section, Topic


class SectionInline(admin.TabularInline):
    model = Section
    extra = 0


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 0


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name"]
    inlines = [SectionInline]


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ["name", "exam", "order"]
    list_filter = ["exam"]
    search_fields = ["name"]
    inlines = [TopicInline]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ["name", "section", "order"]
    list_filter = ["section__exam"]
    search_fields = ["name"]
