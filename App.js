import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Modal, Dimensions } from 'react-native';
import { supabase } from './supabase';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendance, setAttendance] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [note, setNote] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 - 11

  useEffect(() => {
    fetchAttendanceForMonth(year, month);
  }, [year, month]);

  // Fetch attendance for the active month from Supabase
  const fetchAttendanceForMonth = async (y, m) => {
    const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const endDate = `${y}-${String(m + 1).padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .gte('date_key', startDate)
      .lte('date_key', endDate);

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

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const saveStatus = async (status) => {
    const { error } = await supabase
      .from('attendance')
      .upsert({ date_key: selectedDateKey, status, note }, { onConflict: 'date_key' });

    if (error) {
      Alert.alert('Error saving', error.message);
    } else {
      setAttendance(prev => ({ ...prev, [selectedDateKey]: { status, note } }));
      setModalVisible(false);
    }
  };

  // Calculate total days in the active month
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInCurrentMonth }, (_, i) => {
    const dayNum = String(i + 1).padStart(2, '0');
    const monthNum = String(month + 1).padStart(2, '0');
    return `${year}-${monthNum}-${dayNum}`;
  });

  // Calculate stats for summary counts
  let totalPresent = 0;
  let totalAbsent = 0;
  daysArray.forEach(date => {
    if (attendance[date]?.status === 'Present') totalPresent++;
    if (attendance[date]?.status === 'Absent') totalAbsent++;
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* App Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Hostel Ledger</Text>
      </View>

      {/* Month Navigation Bar */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
          <Text style={styles.navBtnText}>◀ Prev</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
          <Text style={styles.navBtnText}>Next ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Summary / Stats Card (3-dot option concept transformed into clean indicators) */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumberGreen}>{totalPresent}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumberRed}>{totalAbsent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumberBlue}>{daysInCurrentMonth - (totalPresent + totalAbsent)}</Text>
          <Text style={styles.statLabel}>Unmarked</Text>
        </View>
      </View>

      <Text style={styles.instructions}>Tap any date to mark your attendance:</Text>

      {/* Responsive Calendar Grid */}
      <View style={styles.grid}>
        {daysArray.map((date) => {
          const record = attendance[date];
          let bgStyle = styles.cellUnmarked;
          if (record?.status === 'Present') bgStyle = styles.cellPresent;
          if (record?.status === 'Absent') bgStyle = styles.cellAbsent;

          const dayNumber = date.split('-')[2];

          return (
            <TouchableOpacity 
              key={date} 
              style={[styles.cell, bgStyle]} 
              onPress={() => { 
                setSelectedDateKey(date); 
                setNote(record?.note || ''); 
                setModalVisible(true); 
              }}
            >
              <Text style={styles.cellDayText}>{dayNumber}</Text>
              <Text style={styles.cellStatusText}>{record ? record.status : '—'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Action Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Date: {selectedDateKey}</Text>
            
            <TextInput 
              placeholder="Add an optional note (e.g. outting)" 
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
              <Text style={{ color: '#666', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F4F3ED', minHeight: '100%', alignItems: 'center' },
  headerContainer: { width: '100%', maxWidth: 500, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2C3531' },
  
  monthNav: { width: '100%', maxWidth: 450, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  navBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#E2E0CD', borderRadius: 6 },
  navBtnText: { fontWeight: 'bold', color: '#444', fontSize: 13 },
  monthTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3531' },

  statsCard: { width: '100%', maxWidth: 450, flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 20, justifyContent: 'space-around', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: '70%', backgroundColor: '#E0E0E0' },
  statNumberGreen: { fontSize: 18, fontWeight: 'bold', color: '#4C7A5E' },
  statNumberRed: { fontSize: 18, fontWeight: 'bold', color: '#B4483A' },
  statNumberBlue: { fontSize: 18, fontWeight: 'bold', color: '#555' },
  statLabel: { fontSize: 11, color: '#777', marginTop: 2 },

  instructions: { color: '#666', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  
  grid: { width: '100%', maxWidth: 480, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  cell: { width: '18%', aspectRatio: 1, backgroundColor: '#FFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 4, borderWidth: 1, borderColor: '#E2E0CD' },
  cellUnmarked: { backgroundColor: '#FFF' },
  cellPresent: { backgroundColor: '#D4EDDA', borderColor: '#C3E6CB' },
  cellAbsent: { backgroundColor: '#F8D7DA', borderColor: '#F5C6CB' },
  cellDayText: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  cellStatusText: { fontSize: 9, color: '#555', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 340, backgroundColor: '#fff', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  input: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelBtn: { marginTop: 12, alignItems: 'center', padding: 8 }
});
    
