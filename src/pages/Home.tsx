import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { User, Bot } from 'lucide-react';
import './Home.css';

// --- INTERFACES ---
interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string; // Add timestamp property
}

// --- COMPONENT ---
const Home: React.FC = () => {
    const navigate = useNavigate();
    const { conversationId: activeConversationId } = useParams<{ conversationId: string }>();

    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(activeConversationId || null);
    const [isLoading, setIsLoading] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [currentAssistantResponse, setCurrentAssistantResponse] = useState(''); // Stores the full response being typed
    const [displayedAssistantResponse, setDisplayedAssistantResponse] = useState(''); // Stores the currently displayed part
    const [typingIndex, setTypingIndex] = useState(0); // Index for typing animation
    const [isTyping, setIsTyping] = useState(false); // Flag for typing animation
    const [loadingMessage, setLoadingMessage] = useState('');
    const chatWindowRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const funLoadingMessages = [
        "당신을 위해 한 번 더 생각하는 중",
        "최고의 답변을 찾고 있어요",
        "데이터의 바다에서 헤엄치는 중",
        "인사이트를 얻기 위해 커피 한 잔 하는 중",
        "창의력을 발휘하는 중",
        "알고리즘과 씨름하고 있어요",
        "잠시만요, 유레카의 순간을 기다리는 중",
        "뉴런을 활성화하고 있어요",
        "지식의 나무를 오르는 중",
        "더 나은 제안을 위해 고심 중"
    ];

    useEffect(() => {
        if (isLoading) {
            const randomIndex = Math.floor(Math.random() * funLoadingMessages.length);
            setLoadingMessage(funLoadingMessages[randomIndex]);
        }
    }, [isLoading]);

    // Effect to load chat history when the component mounts or conversationId from URL changes
    useEffect(() => {
        const fetchHistory = async () => {
            if (!activeConversationId) {
                setMessages([]);
                setConversationId(null);
                return;
            }
            
            setIsHistoryLoading(true);
            try {
                const response = await axios.get(`http://localhost:8080/api/chat/sessions/${activeConversationId}`);
                const historyMessages = response.data.messages.map((msg: Message) => ({
                    ...msg,
                    timestamp: msg.timestamp || new Date(msg.date_sent || Date.now()).toLocaleTimeString('ko-KR') // Assuming date_sent might exist
                }));
                setMessages(historyMessages || []);
                setConversationId(activeConversationId);
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
                setMessages([{ role: 'assistant', content: '대화 기록을 불러오는 데 실패했습니다.', timestamp: new Date().toLocaleTimeString('ko-KR') }]);
            } finally {
                setIsHistoryLoading(false);
            }
        };

        fetchHistory();
    }, [activeConversationId]);
    
    // Effect to scroll to the bottom of the chat window when new messages are added
    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [messages]);

    // Effect to auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height to recalculate scrollHeight
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [userInput]);

    // Effect for typing animation
    useEffect(() => {
        if (isTyping && typingIndex < currentAssistantResponse.length) {
            const timeoutId = setTimeout(() => {
                setDisplayedAssistantResponse(prev => prev + currentAssistantResponse.charAt(typingIndex));
                setTypingIndex(prev => prev + 1);
            }, 20); // Typing speed (milliseconds per character) - faster

            return () => clearTimeout(timeoutId);
        } else if (isTyping && typingIndex === currentAssistantResponse.length) {
            // Animation complete
            setMessages(prev => [...prev, { role: 'assistant', content: currentAssistantResponse, timestamp: new Date().toLocaleTimeString('ko-KR') }]);
            setIsTyping(false);
            setCurrentAssistantResponse(''); // Clear current response
            setTypingIndex(0); // Reset index
            setIsLoading(false); // End loading after animation
        }
    }, [isTyping, typingIndex, currentAssistantResponse, setMessages, setIsLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        const userMessage: Message = { role: 'user', content: userInput, timestamp: new Date().toLocaleTimeString('ko-KR') };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        const payload: { user_message: string; conversation_id?: string | null } = {
            user_message: userInput,
        };

        if (conversationId) {
            payload.conversation_id = conversationId;
        }

        try {
            const response = await axios.post('http://localhost:8080/api/campaigns/build/interactive', payload);
            const { ai_response, conversation_id: newConversationId, is_finished } = response.data;
            
            if (!conversationId && newConversationId) {
                // This was the first message of a new chat.
                // The URL should be updated to reflect the new conversationId.
                navigate(`/chat/${newConversationId}`, { replace: true });
                // If navigating, no typing animation needed for this message as page will change
                setMessages(prev => [...prev, { role: 'assistant', content: ai_response }]);
                setConversationId(newConversationId); // Ensure conversationId is set
                setIsLoading(false); // End loading here if navigating
            } else {
                // Start typing animation for the assistant's response
                setCurrentAssistantResponse(ai_response);
                setDisplayedAssistantResponse('');
                setTypingIndex(0);
                setIsTyping(true);
                // isLoading will be set to false after typing animation completes or if is_finished is true
            }

            if (is_finished) {
                navigate('/promotion/create', { state: { campaignData: response.data.current_campaign_data } });
                // Ensure loading is off if navigating away
                setIsLoading(false);
            }

        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: Message = {
                role: 'assistant',
                content: '오류가 발생했습니다. 메시지를 보내는 데 실패했습니다.',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            if (!isTyping && !newConversationId) { // Only set isLoading false if not typing or navigating
                setIsLoading(false);
            }
        }
    };

    const renderChatContent = () => {
        if (isHistoryLoading) {
            return (
                <div className="initial-prompt">
                    <h2>대화 기록을 불러오는 중...</h2>
                </div>
            );
        }
        return (
            <>
                {messages.map((msg, index) => (
                    <div key={index} className={`message-row ${msg.role}`}>
                        <div className="avatar">
                            {msg.role === 'user' ? (
                                <User size={20} color="white" />
                            ) : (
                                <Bot size={20} color="white" />
                            )}
                        </div>
                        <div className={`message ${msg.role}`}>
                            <p>{msg.content}</p>
                            <span className="message-timestamp">{msg.timestamp}</span> {/* Add timestamp */}
                        </div>
                    </div>
                ))}
                {isLoading && !isTyping && (
                    <div className="message-row assistant">
                        <div className="avatar">
                            <Bot size={20} color="white" />
                        </div>
                        <div className="message assistant">
                            <p>{loadingMessage}<span className="typing-dots"><span>.</span><span>.</span><span>.</span></span></p>
                            <span className="message-timestamp">{new Date().toLocaleTimeString('ko-KR')}</span>
                        </div>
                    </div>
                )}
                {isTyping && (
                    <div className="message-row assistant">
                        <div className="avatar">
                            <Bot size={20} color="white" />
                        </div>
                        <div className="message assistant">
                            <p>{displayedAssistantResponse}<span className="typing-dots"><span>.</span><span>.</span><span>.</span></span></p>
                            <span className="message-timestamp">{new Date().toLocaleTimeString('ko-KR')}</span> {/* Add timestamp for typing message */}
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className={`chat-container ${messages.length === 0 && !isHistoryLoading ? 'initial-state' : ''}`}>
            {messages.length === 0 && !isHistoryLoading ? (
                <>
                    <h1 className="maix-welcome-logo">MAIX</h1>
                    <div className="maix-tagline">
                        <h2>함께 고민하고,</h2>
                        <h2>함께 진화한다.</h2>
                    </div>
                    <h4>마케터의 인사이트에 Agent의 정확도를 더해보세요!</h4>
                </>
            ) : (
                <div className="chat-window" ref={chatWindowRef}>
                    {renderChatContent()}
                </div>
            )}
            <form onSubmit={handleSendMessage} className={`chat-input-form ${messages.length === 0 && !isHistoryLoading ? 'centered-input-form' : ''}`}>
                <div className="chat-input-wrapper">
                    <textarea
                        ref={textareaRef}
                        className="chat-input"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={messages.length === 0 ? "어떤 프로모션을 함께 진행해볼까요?" : "메시지를 입력하세요..."}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <button type="submit" className="chat-send-button" disabled={isLoading || !userInput.trim()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Home;