from rest_framework.decorators import api_view
from rest_framework.response import Response
from preparenote.exams.models import Exam


@api_view(['GET'])
def exams(request):
    exam_list = []
    for exam in Exam.objects.all():
        section_list = []
        for section in exam.sections.all():
            topic_list = []
            for topic in section.topics.all():
                topic_list.append({"topic_id": topic.id, "name": topic.name})
            section_list.append({"section_id": section.id, "name": section.name, "topics": topic_list})
        exam_list.append({"exam_id": exam.id, "name": exam.name, "sections": section_list})

    return Response({"success": True, "exams": exam_list})
