import { getAuthHeaders, parseResponse } from '@/lib/api-headers';

export async function getPosts(category) {
  const headers = getAuthHeaders();
  const params = category && category !== 'all' ? `?category=${category}` : '';
  const res = await fetch(`/api/board/posts${params}`, { headers });
  return parseResponse(res);
}

export async function createPost(data) {
  const headers = getAuthHeaders();
  const res = await fetch('/api/board/posts', { method: 'POST', headers, body: JSON.stringify(data) });
  return parseResponse(res);
}

export async function deletePost(postId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/board/posts/${postId}`, { method: 'DELETE', headers });
  return parseResponse(res);
}

export async function toggleParticipation(postId, status) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/board/posts/${postId}/participate`, {
    method: 'POST', headers, body: JSON.stringify({ status }),
  });
  return parseResponse(res);
}

export async function getMyParticipations() {
  const headers = getAuthHeaders();
  const res = await fetch('/api/board/my-participations', { headers });
  return parseResponse(res);
}

export async function getComments(targetType, targetId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/comments/${targetType}/${targetId}`, { headers });
  return parseResponse(res);
}

export async function createComment(targetType, targetId, content) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/comments/${targetType}/${targetId}`, {
    method: 'POST', headers, body: JSON.stringify({ content }),
  });
  return parseResponse(res);
}

export async function deleteComment(commentId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE', headers });
  return parseResponse(res);
}

export async function getAcademicInfo() {
  const headers = getAuthHeaders();
  const res = await fetch('/api/academic-info', { headers });
  return parseResponse(res);
}

export async function updateAcademicInfo(yearLevel, semester) {
  const headers = getAuthHeaders();
  const res = await fetch('/api/academic-info', {
    method: 'PUT', headers, body: JSON.stringify({ year_level: yearLevel, semester }),
  });
  return parseResponse(res);
}
