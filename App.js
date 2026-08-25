import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
import { supabase } from './supabase';

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // App States
  const [attendance, setAttendance] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [note, setNote] = useState('');

  // Track Auth State & Fetch Data securely
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAttendance(session.user.id);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAttendance(session.user.id);
    });
  }, []);

  const fetchAttendance = async (userId) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error(error.message);
    } else {
      const formatted = {};
      data.forEach(item => {
        formatted[item.date_key] = { status: item.status, note: item.note };
      });
      setAttendance(formatted);
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Failed', error.message);
  };

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else {
      Alert.alert('Success!', 'Account created. You can now log in.');
    }
  };

  const saveStatus = async (status) => {
    if (!session) return;
    const userId = session.user.id;
    const dateKey = selectedDate;

    const { error } = await supabase
      .from('attendance')
      .upsert({ user_id: userId, date_key: dateKey, status, note }, { onConflict: ['user_id', 'date_key'] });

    if (error) {
      Alert.alert('Error saving', error.message);
    } else {
      setAttendance(prev => ({ ...prev, [dateKey]: { status, note } }));
      setModalVisible(false);
    }
  };

  // If user is logged out, show Login/Signup Screen
  if (!session) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.card}>
          <Text style={styles.headerTitle}>Hostel Ledger</Text>
          <Text style={styles.subtitle}>Secure Cloud Attendance Tracking</Text>
          
          <TextInput placeholder="Email Address" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize="none" />
          <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
          
          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
            <Text style={styles.btnText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignUp}>
            <Text style={styles.secondaryBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Generate Current Month Days for Demo Grid
  const daysInMonth = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>My Hostel Ledger</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instructions}>Tap any date below to mark Present or Absent:</Text>

      <View style={styles.grid}>
        {daysInMonth.map((date) => {
          const record = attendance[date];
          let bgStyle = styles.cellUnmarked;
          if (record?.status === 'Present') bgStyle = styles.cellPresent;
          if (record?.status === 'Absent') bgStyle = styles.cellAbsent;

          return (
            <TouchableOpacity key={date} style={[styles.cell, bgStyle]} onPress={() => { setSelectedDate(date); setNote(record?.note || ''); setModalVisible(true); }}>
              <Text style={styles.cellText}>{date.split('-')[2]}</Text>
              <Text style={styles.cellStatus}>{record ? record.status : '-'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Modal to Mark Attendance */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Date: {selectedDate}</Text>
            
            <TextInput placeholder="Add an optional note (e.g. left early)" value={note} onChangeText={setNote} style={styles.input} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4C7A5E' }]} onPress={() => saveStatus('Present')}>
                <Text style={styles.btnText}>Mark Present</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#B4483A' }]} onPress={() => saveStatus('Absent')}>
                <Text style={styles.btnText}>Mark Absent</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={{ color: '#555' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0EFE6', padding: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#fff', padding: 24, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#20241F', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  primaryBtn: { backgroundColor: '#4C7A5E', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  secondaryBtn: { backgroundColor: 'transparent', padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#4C7A5E' },
  secondaryBtnText: { color: '#4C7A5E', fontWeight: 'bold' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  container: { padding: 20, backgroundColor: '#F0EFE6', minHeight: '100%', alignItems: 'center' },
  topBar: { width: '100%', maxWidth: 600, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#20241F' },
  logoutBtn: { backgroundColor: '#B4483A', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  instructions: { color: '#555', marginBottom: 15 },
  grid: { width: '100%', maxWidth: 650, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  cell: { width: 90, height: 90, borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 5, borderWidth: 1, borderColor: '#DDD' },
  cellUnmarked: { backgroundColor: '#FFF' },
  cellPresent: { backgroundColor: '#D4EDDA' },
  cellAbsent: { backgroundColor: '#F8D7DA' },
  cellText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cellStatus: { fontSize: 10, color: '#666', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 320, backgroundColor: '#fff', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 6, alignItems: 'center' },
  cancelBtn: { marginTop: 12, alignItems: 'center', padding: 8 }
});
