import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart3, Database, TrendingUp, Sparkles } from 'lucide-react';
import ktLogo from '../assets/KT_Logo.png';

interface ChatSession {
    conversationId: string;
    title: string;
}

const GlobalHeader: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const SESSIONS_PER_PAGE = 10;
    const MAX_SESSIONS = 50;


    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const fetchSessions = async (pageNum: number) => {
        // Prevent fetching if already loading or max sessions reached unless it's the very first fetch
        if (isLoading || (sessions.length >= MAX_SESSIONS && pageNum > 0)) return;
        
        setIsLoading(true);
        try {
            const response = await axios.get('/api/chat/sessions', {
                params: { page: pageNum, size: SESSIONS_PER_PAGE }
            });
            const newSessions = response.data.content || [];
            
            // Only update sessions if newSessions are returned, otherwise keep existing
            setSessions(prev => {
                const updatedSessions = pageNum === 0 ? newSessions : [...prev, ...newSessions];
                // Filter out duplicates if any (though API should handle this)
                const uniqueSessions = Array.from(new Map(updatedSessions.map(session => [session.conversationId, session])).values());
                return uniqueSessions;
            });
            setTotalPages(response.data.totalPages);
            setPage(pageNum);

        } catch (error) {
            console.error("Failed to fetch chat sessions:", error);
            // On error for non-initial fetches, prevent showing more
            if (pageNum > 0) setTotalPages(page);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSession = async (conversationId: string, event: React.MouseEvent) => {
        event.preventDefault(); // Prevent NavLink click
        event.stopPropagation(); // Stop event from propagating to parent elements
        if (!window.confirm('정말로 이 대화 기록을 삭제하시겠습니까?')) {
            return;
        }

        try {
            await axios.delete(`/api/chat/sessions/${conversationId}`);
            alert('대화 기록이 삭제되었습니다.');

            // Immediately remove the session from the UI
            setSessions(prevSessions => prevSessions.filter(s => s.conversationId !== conversationId));

            // If the deleted conversation was the active one, navigate to home
            if (location.pathname === `/chat/${conversationId}`) {
                navigate('/');
            }
        } catch (error) {
            console.error("Failed to delete chat session:", error);
            alert('대화 기록 삭제에 실패했습니다.');
        }
    };
    
    // Fetch initial sessions when menu is opened for the first time
    useEffect(() => {
        if (isMenuOpen) { // Fetch every time menu opens to ensure fresh list
            setSessions([]); // Clear previous sessions before fetching
            fetchSessions(0);
        }
    }, [isMenuOpen]);

    // Close menu on route change
    useEffect(() => {
        closeMenu();
    }, [location]);

    const handleShowMore = () => {
        if (page < totalPages - 1 && sessions.length < MAX_SESSIONS) {
            fetchSessions(page + 1);
        }
    };
    
    const canShowMore = !isLoading && (page < totalPages - 1) && sessions.length < MAX_SESSIONS;

    const isPromotionActive = location.pathname.startsWith('/promotion') && location.pathname !== '/promotion/create';


    return (
        <>
            <header className="global-header">
                <button className={`hamburger-menu ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <Link to="/" className="logo-link">
                    <div className="logo">
                        <span className="logo-main">MAIX</span>
                        <span className="logo-separator">|</span>
                        <img src={ktLogo} alt="KT Logo" className="logo-kt-img" />
                    </div>
                </Link>
            </header>

            <aside className={`nav-drawer ${isMenuOpen ? 'open' : ''}`}>
                <div className="drawer-header">
                    <Link to="/" className="logo-link" onClick={closeMenu}>
                        <div className="logo">
                            <span className="logo-main">MAIX</span>
                            <span className="logo-separator">|</span>
                            <img src={ktLogo} alt="KT Logo" className="logo-kt-img" />
                        </div>
                    </Link>
                </div>
                <nav className="nav-menu">
                    <ul className="static-menu">
                         <li>
                            <NavLink to="/promotion/create" onClick={closeMenu}>
                                <Sparkles size={16} style={{ marginRight: '8px' }} />
                                직접 프로모션 형성하기
                            </NavLink>
                         </li>
                         <li>
                            <NavLink
                                to="/promotion"
                                className={() => isPromotionActive ? 'active' : ''}
                                onClick={closeMenu}
                            >
                                <BarChart3 size={16} style={{ marginRight: '8px' }} />
                                프로모션
                            </NavLink>
                         </li>
                         <li>
                            <NavLink to="/rag-db" onClick={closeMenu}>
                                <Database size={16} style={{ marginRight: '8px' }} />
                                AI 학습 데이터
                            </NavLink>
                         </li>
                    </ul>
                    <hr className="menu-divider" />
                    <NavLink to="/" className="new-chat-link" onClick={closeMenu}>
                        새 채팅
                    </NavLink>
                    <ul className="history-menu">
                        {sessions.map(session => (
                            <li key={session.conversationId} className="chat-session-item">
                                <NavLink to={`/chat/${session.conversationId}`} className={({ isActive }) => isActive ? 'active chat-link-text' : 'chat-link-text'} onClick={closeMenu}>
                                    <span className="chat-title">{session.title}</span>
                                    <button
                                        className="delete-session-btn"
                                        onClick={(e) => handleDeleteSession(session.conversationId, e)}
                                        aria-label={`Delete conversation ${session.title}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-trash-2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                    {isLoading && <div className="loading-indicator"><p>로딩 중...</p></div>}
                    {canShowMore && (
                        <button onClick={handleShowMore} className="show-more-btn">
                            더보기 ↓
                        </button>
                    )}
                </nav>
            </aside>
            
            {isMenuOpen && <div className="backdrop" onClick={closeMenu}></div>}
        </>
    );
};

export default GlobalHeader;

