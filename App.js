import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
import { supabase } from './supabase';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

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

  // Calculate days in active month
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  
  // Dynamic daily rate: ₹150 for 30-day months, ₹145 for 31-day months (or custom logic)
  const dailyRate = daysInCurrentMonth === 30 ? 150 : 145;

  const daysArray = Array.from({ length: daysInCurrentMonth }, (_, i) => {
    const dayNum = i + 1;
    const dayString = String(dayNum).padStart(2, '0');
    const monthString = String(month + 1).padStart(2, '0');
    const dateKey = `${year}-${monthString}-${dayString}`;
    
    // Get Day of Week (0 = Sun, 1 = Mon, etc.)
    const dayOfWeekIndex = new Date(year, month, dayNum).getDay();
    
    return {
      dateKey,
      dayNum,
      dayName: DAY_LABELS[dayOfWeekIndex]
    };
  });

  // Calculate stats & total money
  let totalPresent = 0;
  let totalAbsent = 0;
  daysArray.forEach(item => {
    if (attendance[item.dateKey]?.status === 'Present') totalPresent++;
    if (attendance[item.dateKey]?.status === 'Absent') totalAbsent++;
  });

  const totalMoney = totalPresent * dailyRate;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Hostel Ledger</Text>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
          <Text style={styles.navBtnText}>◀ Prev</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
          <Text style={styles.navBtnText}>Next ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Stats & Money Summary Card */}
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
          <Text style={styles.statNumberMoney}>₹{totalMoney}</Text>
          <Text style={styles.statLabel}>Total Due (₹{dailyRate}/day)</Text>
        </View>
      </View>

      <Text style={styles.instructions}>Tap any date cell to mark attendance:</Text>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {daysArray.map((item) => {
          const record = attendance[item.dateKey];
          let bgStyle = styles.cellUnmarked;
          if (record?.status === 'Present') bgStyle = styles.cellPresent;
          if (record?.status === 'Absent') bgStyle = styles.cellAbsent;

          return (
            <TouchableOpacity 
              key={item.dateKey} 
              style={[styles.cell, bgStyle]} 
              onPress={() => { 
                setSelectedDateKey(item.dateKey); 
                setNote(record?.note || ''); 
                setModalVisible(true); 
              }}
            >
              <Text style={styles.cellDayName}>{item.dayName}</Text>
              <Text style={styles.cellDayNumber}>{item.dayNum}</Text>
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
  
  monthNav: { width: '100%', maxWidth: 450, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 15, elevation: 2 },
  navBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#E2E0CD', borderRadius: 6 },
  navBtnText: { fontWeight: 'bold', color: '#444', fontSize: 13 },
  monthTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3531' },

  statsCard: { width: '100%', maxWidth: 450, flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 20, justifyContent: 'space-around', alignItems: 'center', elevation: 2 },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: '70%', backgroundColor: '#E0E0E0' },
  statNumberGreen: { fontSize: 16, fontWeight: 'bold', color: '#4C7A5E' },
  statNumberRed: { fontSize: 16, fontWeight: 'bold', color: '#B4483A' },
  statNumberMoney: { fontSize: 16, fontWeight: 'bold', color: '#2C3531' },
  statLabel: { fontSize: 10, color: '#777', marginTop: 2, textAlign: 'center' },

  instructions: { color: '#666', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  
  grid: { width: '100%', maxWidth: 480, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  cell: { width: '18%', aspectRatio: 1, backgroundColor: '#FFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 2, borderWidth: 1, borderColor: '#E2E0CD' },
  cellUnmarked: { backgroundColor: '#FFF' },
  cellPresent: { backgroundColor: '#D4EDDA', borderColor: '#C3E6CB' },
  cellAbsent: { backgroundColor: '#F8D7DA', borderColor: '#F5C6CB' },
  cellDayName: { fontSize: 9, fontWeight: '600', color: '#666' },
  cellDayNumber: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  cellStatusText: { fontSize: 8, color: '#555', marginTop: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 340, backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  input: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelBtn: { marginTop: 12, alignItems: 'center', padding: 8 }
});
  
