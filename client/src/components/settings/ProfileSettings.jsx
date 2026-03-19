import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.user_metadata?.name || '');
  const [studentId, setStudentId] = useState(user?.user_metadata?.student_id || '');
  const [major, setMajor] = useState(user?.user_metadata?.major || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const currentAvatarUrl = user?.user_metadata?.avatar_url || null;
  const initials = (user?.user_metadata?.name || user?.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const validate = () => {
    const newErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Name is required';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 50) {
      newErrors.name = 'Name must be 50 characters or fewer';
    }

    const trimmedStudentId = studentId.trim();
    if (trimmedStudentId && !/^\d+$/.test(trimmedStudentId)) {
      newErrors.studentId = 'Student ID must be numeric';
    }

    return newErrors;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErrors((prev) => ({ ...prev, avatar: 'Only PNG, JPG, and WebP images are allowed' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, avatar: 'Image must be smaller than 5MB' }));
      return;
    }

    setErrors((prev) => ({ ...prev, avatar: undefined }));
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('full_name', name.trim());
      if (studentId.trim()) formData.append('student_id', studentId.trim());
      if (major.trim()) formData.append('major', major.trim());
      if (avatarFile) formData.append('avatar', avatarFile);

      await updateUser(formData);
      setAvatarFile(null);
      setAvatarPreview(null);
      addToast('Profile updated successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile</CardTitle>
        <CardDescription>Update your personal information and avatar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar upload */}
        <div className="flex items-center gap-4">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Avatar className="h-20 w-20 ring-4 ring-indigo-100 shadow">
              {(avatarPreview || currentAvatarUrl) && (
                <AvatarImage src={avatarPreview || currentAvatarUrl} alt="Profile" className="object-cover" />
              )}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          <div>
            <p className="text-sm font-medium">Profile Photo</p>
            <p className="text-xs text-muted-foreground">PNG, JPG or WebP, max 5MB</p>
            {errors.avatar && <p className="text-xs text-destructive mt-1">{errors.avatar}</p>}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="settings-name" className="text-sm font-medium">
            Full Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            disabled={loading}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Email</label>
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
            {user?.email}
          </p>
        </div>

        {/* Student ID */}
        <div className="space-y-1.5">
          <label htmlFor="settings-student-id" className="text-sm font-medium">
            Student ID <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <Input
            id="settings-student-id"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="e.g. 12345678"
            disabled={loading}
          />
          {errors.studentId && <p className="text-xs text-destructive">{errors.studentId}</p>}
        </div>

        {/* Major */}
        <div className="space-y-1.5">
          <label htmlFor="settings-major" className="text-sm font-medium">
            Major <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <Input
            id="settings-major"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="e.g. Computer Science"
            disabled={loading}
          />
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}
