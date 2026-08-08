import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrainerStore } from '@/store/trainerStore';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { NeumorphicInput } from '@/components/NeumorphicInput';

export default function TrainerMessagesScreen() {
  const insets = useSafeAreaInsets();
  const { clients, messages, sendMessage, selectedClientId, setSelectedClient } = useTrainerStore();
  const [text, setText] = useState('');

  const activeClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const clientMessages = messages.filter(
    (m) => m.sender_id === activeClient.id || m.receiver_id === activeClient.id
  );

  const handleSend = () => {
    if (!text) return;
    sendMessage(activeClient.id, text);
    setText('');
  };

  return (
    <View
      className="flex-1 bg-deepGreen p-5"
      style={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 12,
      }}
    >
      <Text className="text-2xl font-black text-white mb-1 tracking-wide">Client Conversations</Text>
      <Text className="text-xs text-sage mb-4">Direct message channel with your roster</Text>

      {/* Client Selector Header */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2 mb-4 max-h-12">
        {clients.map((c) => (
          <TouchableOpacity
            key={c.id}
            className={`px-3.5 py-2 rounded-xl border mr-2 ${
              activeClient.id === c.id
                ? 'bg-gold-light border-gold-bright'
                : 'bg-deepGreen-elevated border-deepGreen-border'
            }`}
            onPress={() => setSelectedClient(c.id)}
          >
            <Text
              className={`text-xs font-bold ${
                activeClient.id === c.id ? 'text-deepGreen-dark' : 'text-sage'
              }`}
            >
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <NeumorphicView variant="inset" className="flex-1 p-4 mb-4">
        <ScrollView className="flex-1">
          {clientMessages.map((m) => {
            const isTrainer = m.sender_id === 'current_user' || m.sender_id === 'trainer1';
            return (
              <View
                key={m.id}
                className={`mb-3 p-3.5 rounded-2xl max-w-[80%] ${
                  isTrainer
                    ? 'bg-gold-light border border-gold-bright self-end'
                    : 'bg-deepGreen-elevated border border-deepGreen-border self-start'
                }`}
              >
                <Text className={`text-xs ${isTrainer ? 'text-deepGreen-dark font-semibold' : 'text-white'}`}>
                  {m.text}
                </Text>
                <Text className={`text-[10px] mt-1 ${isTrainer ? 'text-deepGreen/70' : 'text-sage'}`}>
                  {m.timestamp}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </NeumorphicView>

      <View className="flex-row space-x-2 items-center">
        <View className="flex-1">
          <NeumorphicInput
            placeholder={`Message ${activeClient.name}...`}
            value={text}
            onChangeText={setText}
            containerClassName="mb-0"
          />
        </View>
        <NeumorphicButton
          title="Send"
          variant="gold"
          size="md"
          onPress={handleSend}
        />
      </View>
    </View>
  );
}

