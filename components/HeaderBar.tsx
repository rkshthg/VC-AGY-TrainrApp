import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';

interface HeaderBarProps {
  onOpenSettings: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenSettings }) => {
  const profile = useAuthStore((state) => state.profile);
  const role = useAuthStore((state) => state.role);
  const setProfile = useAuthStore((state) => state.setProfile);

  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  const name = profile?.fullName || 'User';

  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
  ];

  const handleSelectAvatar = (url?: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      avatarUrl: url,
    });
    setAvatarModalVisible(false);
    Alert.alert('Profile Picture Updated', 'Your profile picture has been updated!');
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {/* TAPPABLE PROFILE AVATAR ICON */}
        <TouchableOpacity
          onPress={() => setAvatarModalVisible(true)}
          activeOpacity={0.8}
          style={styles.avatarTouchable}
        >
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, role === 'TRAINER' ? styles.avatarTrainer : styles.avatarClient]}>
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.cameraEditBadge}>
            <Text style={styles.cameraEditBadgeIcon}>📷</Text>
          </View>
        </TouchableOpacity>

        <View>
          <Text style={styles.greetingText}>Hello, {name} 👋</Text>
          <Text style={styles.roleBadge}>
            {role === 'TRAINER' ? '⚡ Trainer Account' : '🏋️ Client Account'}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.menuButton} onPress={onOpenSettings} activeOpacity={0.7}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* PROFILE PICTURE PICKER MODAL */}
      <Modal
        visible={avatarModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🖼️ Change Profile Picture</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Select a profile photo preset or remove existing photo:</Text>

            <View style={styles.presetGrid}>
              {avatarPresets.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.presetSlot, profile?.avatarUrl === uri && styles.presetSlotActive]}
                  onPress={() => handleSelectAvatar(uri)}
                >
                  <Image source={{ uri }} style={styles.presetImg} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleSelectAvatar(undefined)}
              >
                <Text style={styles.removeBtnText}>Remove Photo (Use Initials)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarClient: {
    backgroundColor: '#10B981',
  },
  avatarTrainer: {
    backgroundColor: '#F59E0B',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  cameraEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1E293B',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  cameraEditBadgeIcon: {
    fontSize: 9,
  },
  greetingText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  roleBadge: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalCloseText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 16,
  },
  presetGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  presetSlot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetSlotActive: {
    borderColor: '#10B981',
  },
  presetImg: {
    width: '100%',
    height: '100%',
  },
  modalActionRow: {
    gap: 10,
  },
  removeBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
