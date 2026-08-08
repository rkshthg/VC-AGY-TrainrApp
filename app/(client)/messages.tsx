import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrainerStore } from '@/store/trainerStore';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { NeumorphicInput } from '@/components/NeumorphicInput';

export default function ClientMessagesScreen() {
  const insets = useSafeAreaInsets();
  const { messages, sendMessage } = useTrainerStore();
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text) return;
    sendMessage('trainer1', text);
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
      <Text className="text-2xl font-black text-white mb-1 tracking-wide">Trainer Chat</Text>
      <Text className="text-xs text-sage mb-4">Direct message channel with your personal coach</Text>

      <NeumorphicView variant="inset" className="flex-1 p-4 mb-4">
        <ScrollView className="flex-1">
          {messages.map((m) => {
            const isMe = m.sender_id === 'current_user';
            return (
              <View
                key={m.id}
                className={`mb-3 p-3.5 rounded-2xl max-w-[80%] ${
                  isMe
                    ? 'bg-gold-light border border-gold-bright self-end'
                    : 'bg-deepGreen-elevated border border-deepGreen-border self-start'
                }`}
              >
                <Text className={`text-xs ${isMe ? 'text-deepGreen-dark font-semibold' : 'text-white'}`}>
                  {m.text}
                </Text>
                <Text className={`text-[10px] mt-1 ${isMe ? 'text-deepGreen/70' : 'text-sage'}`}>
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
            placeholder="Message your trainer..."
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

