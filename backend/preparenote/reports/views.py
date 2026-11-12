from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from preparenote.quickstart.models import Note
from preparenote.reports.models import Report


def reportToDict(report):
    return {
        "report_id": report.id,
        "note_id": report.note_id,
        "reason": report.reason,
    }

def reportNotePost(request, note_id):
    # Private notes look like they don't exist, same as GET /notes/<id>/
    note = Note.objects.filter(note_id=note_id).first()
    if note is None or not note.is_public:
        return Response({"success": False, "error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

    if note.user == request.user:
        return Response({"success": False, "error": "You cannot report your own note."}, status=status.HTTP_400_BAD_REQUEST)

    reason = str(request.data.get('reason') or '').strip()
    if reason == '':
        return Response({"success": False, "error": "Please give a reason for the report."}, status=status.HTTP_400_BAD_REQUEST)
    if len(reason) > Report.REASON_MAX_LENGTH:
        return Response({"success": False, "error": "Reason must be 500 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)

    if Report.objects.filter(note=note, reporter=request.user).exists():
        return Response({"success": False, "error": "You already reported this note."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            report = Report.objects.create(note=note, reporter=request.user, reason=reason)
    except IntegrityError:
        # Two clicks at the same time can both pass the check above
        return Response({"success": False, "error": "You already reported this note."}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"success": True, "report": reportToDict(report)}, status=status.HTTP_201_CREATED)

def reportNoteGet(request, note_id):
    # Get the note
    note = Note.objects.filter(note_id=note_id).first()
    if note is None or not note.is_public:
            return Response({"success": False, "error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

    # Get the report (missing if does not exist or is not authorized)
    report = Report.objects.filter(note=note, reporter=request.user).first()
    if report is None:
        return Response({"success": False, "error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

    # Return the report content
    return Response({"success": True, "report": reportToDict(report)})

@api_view(['GET', 'POST'])
def reportNote(request, note_id):
    if request.method == "POST":
        return reportNotePost(request, note_id)
    else:
        return reportNoteGet(request, note_id)

@api_view(['GET'])
def listReports(request, note_id):
    # Ensure authorized
    if not request.user.is_staff:
        return Response({"success": False, "error": "You cannot view all reports"}, status=status.HTTP_401_UNAUTHORIZED);

    # Get the note
    note = Note.objects.filter(note_id=note_id).first()
    if note is None:
            return Response({"success": False, "error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

    # Get the reports associated with the note
    reports = Report.objects.filter(note_id=note_id)
    reportDicts = []
    for report in reports:
        reportDicts.append(reportToDict(report))

    return Response({"success": True, "reports": reportDicts})

@api_view(['POST'])
def removeReport(request, note_id, reporter_id):
    # Reporter id can be assumed from user if not provided
    if not reporter_id:
         reporter_id = request.user.id

    # Get the note
    note = Note.objects.filter(note_id=note_id).first()
    if note is None:
            return Response({"success": False, "error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

    # Get the reporter
    reporter = get_user_model().objects.filter(id=reporter_id).first()
    if reporter is None:
         return Response({"success": False, "error": "User not found"})

    # Get the report. Ensure either user owns report or user is staff
    report = Report.objects.filter(note=note, reporter=reporter).first()
    if report is None or (request.user != reporter and not request.user.is_staff):
         return Response({"success": False, "error": "Report not found"})

    # Remove the report
    report.delete()

    return Response({"success": True})