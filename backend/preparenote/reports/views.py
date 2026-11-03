from django.db import IntegrityError, transaction
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

@api_view(['POST'])
def reportNote(request, note_id):
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
