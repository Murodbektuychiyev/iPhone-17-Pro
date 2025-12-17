class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-black"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [userId, setUserId] = React.useState('');
  const [comments, setComments] = React.useState([]);
  const [inputValue, setInputValue] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [modelLoading, setModelLoading] = React.useState(true);
  const [countdown, setCountdown] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
  const [danmakuVisible, setDanmakuVisible] = React.useState(true);


  // Generate or get user ID from localStorage and start countdown
  React.useEffect(() => {
    let uid = localStorage.getItem('iphone17_user_id');
    if (!uid) {
      uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('iphone17_user_id', uid);
    }
    setUserId(uid);
    
    // Countdown timer - target date: Sept 9, 2025 10:00 AM PT (PDT is UTC-7, PST is UTC-8)
    // Since it's September, we use PDT (UTC-7)
    const targetDate = new Date('2025-09-09T10:00:00-07:00');
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate - now;
      
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setCountdown({ days, hours, minutes, seconds, expired: false });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
      }
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(timer);
  }, []);







  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading || !userId) return;
    
    const commentText = inputValue.trim();
    
    setLoading(true);
    try {
      const newComment = await trickleCreateObject('danmaku_comment', {
        user_id: userId,
        text: commentText,
        created_at: new Date().toISOString(),
        likes_count: 0
      });
      
      // Add comment to local state for immediate display
      setComments(prev => [{
        id: newComment.objectId,
        text: newComment.objectData.text,
        createdAt: newComment.createdAt,
        likesCount: newComment.objectData.likes_count || 0
      }, ...prev.slice(0, 99)]);
      
      // Immediately show danmaku using window method
      if (window.addDanmaku) {
        window.addDanmaku(commentText);
      }
      
      setInputValue('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModelLoad = () => {
    console.log('Model loaded successfully');
    setModelLoading(false);
  };

  const handleModelError = (event) => {
    console.log('Model loading error:', event);
    setModelLoading(false);
  };

  try {
    return (
      <div className="relative min-h-screen overflow-hidden" data-name="app" data-file="app.js">
        {/* Liquid Background with black placeholder */}
        <div className="absolute inset-0 bg-black">
          <LiquidBackground />
        </div>
        
        {/* Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="p-8 text-center">
            <h1 className="text-4xl md:text-6xl mb-4 text-shadow">
              iPhone 17 Pro
            </h1>
            <p className="text-lg md:text-xl text-white text-opacity-80 font-light mb-2">
              Launching Soon • Sept 9, 10 AM PT • Revolutionary Design
            </p>
            
            {/* Countdown Timer */}
            {!countdown.expired && (
              <div className="text-2xl md:text-3xl font-bold text-white mb-6 text-shadow">
                {countdown.days}d {countdown.hours.toString().padStart(2, '0')}h{' '}
                {countdown.minutes.toString().padStart(2, '0')}m{' '}
                {countdown.seconds.toString().padStart(2, '0')}s
              </div>
            )}
            <div className="w-80 h-80 md:w-96 md:h-96 mx-auto mb-6 relative glass-effect">
              {modelLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="text-white text-lg font-medium">Loading...</div>
                </div>
              )}
              <model-viewer
                src="https://devproto.trickle.so/storage/public/images/usr_09073b5640000001/b22bb0b4-ba00-4068-92ba-ca6fe2ca22b3.glb"
                alt="iPhone 17 Pro 3D Model - Interactive 3D Preview"
                auto-rotate
                camera-controls
                style={{width: '100%', height: '100%'}}
                loading="eager"
                ref={(el) => {
                  if (el) {
                    el.addEventListener('load', handleModelLoad);
                    el.addEventListener('error', handleModelError);
                  }
                }}
              ></model-viewer>
            </div>
            <p className="hidden md:block text-base md:text-lg text-white text-opacity-90 font-light mb-6">
              Experience unprecedented performance and innovation.<br/>
              The most advanced iPhone ever created.
            </p>
            {/* Comment Input with Toggle Button */}
            <form onSubmit={handleSubmitComment} className="flex items-center gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setDanmakuVisible(!danmakuVisible)}
                className="w-10 h-10 rounded-full glass-effect text-white hover:bg-white hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center"
                title={danmakuVisible ? 'Hide Comments' : 'Show Comments'}
              >
                <div className={`icon-${danmakuVisible ? 'eye-off' : 'eye'} text-sm`}></div>
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Share your thoughts..."
                className="flex-1 px-4 py-2 rounded-full glass-effect text-white placeholder-white placeholder-opacity-70 border-0 outline-0"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="px-6 py-2 rounded-full bg-white bg-opacity-20 text-white font-medium hover:bg-opacity-30 transition-all duration-300 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </form>
            
            {/* Remix Button */}
            <div className="mt-4 w-full max-w-md mx-auto">
              <a
                href="https://trickle.so?remix=proj_1NSNo2jpi4P"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 rounded-full glass-effect text-white text-center font-medium hover:bg-white hover:bg-opacity-20 transition-all duration-300"
              >
                Remix This Project
              </a>
            </div>
          </div>
        </div>
        
        {/* Danmaku Manager */}
        <DanmakuManager
          userId={userId}
          onCommentsUpdate={setComments}
          visible={danmakuVisible}
        />
      </div>
    );
  } catch (error) {
    console.error('App component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);