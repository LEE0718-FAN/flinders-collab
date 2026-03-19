import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import colors from '../theme/colors';

const MAJORS = [
  'Computer Science',
  'Information Technology',
  'Engineering',
  'Business',
  'Education',
  'Health Sciences',
  'Law',
  'Medicine',
  'Nursing',
  'Psychology',
  'Science',
  'Social Work',
  'Other',
];

export function SignupScreen({ navigation }) {
  const signup = useAuthStore((s) => s.signup);
  const setSession = useAuthStore((s) => s.setSession);

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    student_id: '',
    major: '',
    password: '',
    confirmPassword: '',
  });
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate() {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!form.email.toLowerCase().endsWith('@flinders.edu.au')) {
      newErrors.email = 'Must use a @flinders.edu.au email address';
    }

    if (!form.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!form.student_id.trim()) {
      newErrors.student_id = 'Student ID is required';
    }

    if (!form.major) {
      newErrors.major = 'Please select your major';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  }

  async function handleSignup() {
    setServerError('');
    setSuccessMsg('');
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signup({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.full_name.trim(),
        student_id: form.student_id.trim(),
        major: form.major,
      });
      setSuccessMsg('Account created! Please sign in.');
      setTimeout(() => navigation.navigate('Login'), 1500);
    } catch (err) {
      setServerError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Flinders Collab</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {serverError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{serverError}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successBoxText}>{successMsg}</Text>
            </View>
          ) : null}

          <Input
            label="University Email"
            placeholder="you@flinders.edu.au"
            value={form.email}
            onChangeText={(v) => setField('email', v)}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email}
          />

          <Input
            label="Full Name"
            placeholder="Your full name"
            value={form.full_name}
            onChangeText={(v) => setField('full_name', v)}
            autoCapitalize="words"
            error={errors.full_name}
          />

          <Input
            label="Student ID"
            placeholder="e.g. 1234567"
            value={form.student_id}
            onChangeText={(v) => setField('student_id', v)}
            keyboardType="numeric"
            error={errors.student_id}
          />

          {/* Major picker */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Major / Degree Program</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                errors.major && styles.pickerButtonError,
              ]}
              onPress={() => setShowMajorPicker(!showMajorPicker)}
            >
              <Text
                style={[
                  styles.pickerText,
                  !form.major && styles.pickerPlaceholder,
                ]}
              >
                {form.major || 'Select your major'}
              </Text>
            </TouchableOpacity>
            {errors.major ? (
              <Text style={styles.errorText}>{errors.major}</Text>
            ) : null}
            {showMajorPicker && (
              <View style={styles.pickerList}>
                {MAJORS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.pickerItem,
                      form.major === m && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      setField('major', m);
                      setShowMajorPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        form.major === m && styles.pickerItemTextSelected,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Input
            label="Password"
            placeholder="At least 8 characters"
            value={form.password}
            onChangeText={(v) => setField('password', v)}
            secureTextEntry
            autoComplete="new-password"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChangeText={(v) => setField('confirmPassword', v)}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button onPress={handleSignup} loading={loading} style={styles.signupBtn}>
            Create Account
          </Button>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBoxText: {
    color: colors.error,
    fontSize: 14,
  },
  successBox: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successBoxText: {
    color: colors.success,
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  pickerButton: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  pickerButtonError: {
    borderColor: colors.error,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerPlaceholder: {
    color: colors.textMuted,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
  pickerList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    maxHeight: 200,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pickerItemSelected: {
    backgroundColor: colors.secondary,
  },
  pickerItemText: {
    fontSize: 15,
    color: colors.text,
  },
  pickerItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  signupBtn: {
    marginTop: 8,
  },
  loginLink: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLinkBold: {
    color: colors.accent,
    fontWeight: '600',
  },
});

export default SignupScreen;
