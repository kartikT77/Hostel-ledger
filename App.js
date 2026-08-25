import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
import { supabase } from './supabase';

export default function App() {
  const [attendance, setAttendance] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [note, setNote] = useState('');

  // Fetch all attendance records on load
  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*');

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

  const saveStatus = async (status) => {
    const dateKey = selectedDate;

    // Save using date_key as the unique identifier
    const { error } = await supabase
      .from('attendance')
      .upsert({ date_key: dateKey, status, note }, { onConflict: 'date_key' });

    if (error) {
      Alert.alert('Error saving', error.message);
    } else {
      setAttendance(prev => ({ ...prev, [dateKey]: { status, note } }));
      setModalVisible(false);
    }
  };

  const daysInMonth = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Hostel Ledger</Text>
      </View>

      <Text style={styles.instructions}>Tap any date below to mark Present or Absent:</Text>

      <View style={styles.grid}>
        {daysInMonth.map((date) => {
          const record = attendance[date];
          let bgStyle = styles.cellUnmarked;
          if (record?.status === 'Present') bgStyle = styles.cellPresent;
          if (record?.status === 'Absent') bgStyle = styles.cellAbsent;

          return (
            <TouchableOpacity 
              key={date} 
              style={[styles.cell, bgStyle]} 
              onPress={() => { 
                setSelectedDate(date); 
                setNote(record?.note || ''); 
                setModalVisible(true); 
              }}
            >
              <Text style={styles.cellText}>{date.split('-')[2]}</Text>
              <Text style={styles.cellStatus}>{record ? record.status : '-'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Date: {selectedDate}</Text>
            
            <TextInput 
              placeholder="Add an optional note" 
              value={note} 
              onChangeText={setNote} 
              style={styles.input} 
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4C7A5E' }]} onPress={() => saveStatus('Present')}>
                <Text style={styles.btnText}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#B4483A' }]} onPress={() => saveStatus('Absent')}>
                <Text style={styles.btnText}>Absent</Text>
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
  container: { padding: 20, backgroundColor: '#F0EFE6', minHeight: '100%', alignItems: 'center' },
  topBar: { width: '100%', maxWidth: 600, alignItems: 'center', marginTop: 40, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#20241F' },
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
  input: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: { marginTop: 12, alignItems: 'center', padding: 8 }
});
