import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import { Icon } from './ui/Icon';
import { searchExercises, type CatalogExercise, type Equipment, type Modality } from '../lib/data';

export interface ExercisePickerModalProps {
  visible: boolean;
  equipment: Equipment;
  /** Restrict results to one modality (e.g. cardio-only for item #17's session logger) — omit to search everything, as item #18's manual plan-add does. */
  modality?: Modality;
  onSelect: (exercise: CatalogExercise) => void;
  onClose: () => void;
}

/**
 * Shared exercise search/browse UI — item #18 ("user should be able to
 * manually add workouts, selecting exercises from our dataset") and item
 * #17's ad-hoc session logger both need the exact same real catalog
 * lookup, scoped to the user's own equipment tier so nothing unreachable
 * shows up.
 */
export function ExercisePickerModal({ visible, equipment, modality, onSelect, onClose }: ExercisePickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogExercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const handle = setTimeout(() => {
      searchExercises(query, equipment, modality).then((r) => {
        setResults(r);
        setLoading(false);
      });
    }, 200); // debounce so every keystroke doesn't fire a query
    return () => clearTimeout(handle);
  }, [visible, query, equipment, modality]);

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: COLORS.card,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 18,
            paddingTop: 16,
            paddingBottom: 28,
            height: '75%',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', fontFamily: FONT }}>
              {modality === 'cardio' ? 'Pick a cardio exercise' : 'Add an exercise'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Icon name="x" size={18} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises…"
            placeholderTextColor="#52525B"
            autoFocus
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              borderRadius: 12,
              color: '#fff',
              fontSize: 14,
              paddingHorizontal: 14,
              paddingVertical: 11,
              marginBottom: 12,
              fontFamily: FONT,
            }}
          />

          {loading ? (
            <Text style={{ color: '#71717A', fontSize: 12, fontFamily: FONT, textAlign: 'center', marginTop: 20 }}>Searching…</Text>
          ) : results.length === 0 ? (
            <Text style={{ color: '#71717A', fontSize: 12, fontFamily: FONT, textAlign: 'center', marginTop: 20 }}>
              No exercises match your equipment/search.
            </Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onSelect(item)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 13,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <View>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: FONT }}>{item.name}</Text>
                    {item.muscle_group ? (
                      <Text style={{ color: '#71717A', fontSize: 11, marginTop: 2, fontFamily: FONT }}>{item.muscle_group}</Text>
                    ) : null}
                  </View>
                  <Icon name="plus" size={18} color="#71717A" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
