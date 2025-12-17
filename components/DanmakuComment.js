/**
 * Danmaku Comment Component
 * Displays floating comments that move from right to left across the screen
 */
function DanmakuComment({ text, commentId, likesCount = 0, onComplete, onLike }) {
  const commentRef = React.useRef(null);
  const danmakuId = React.useRef(Date.now() + Math.random());
  const animationRef = React.useRef(null);
  const initialTextRef = React.useRef(text);
  const fixedTopPosition = React.useRef(Math.random() * (window.innerHeight * 0.6) + window.innerHeight * 0.2);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isLiked, setIsLiked] = React.useState(false);
  const [currentLikes, setCurrentLikes] = React.useState(likesCount);
  
  // Calculate scale based on likes (80% base + 2% per like, no upper limit)
  const getScale = (likes) => {
    const baseScale = 0.8; // 80%
    const scalePerLike = 0.02; // 2% per like
    
    return baseScale + (likes * scalePerLike);
  };
  
  const currentScale = getScale(currentLikes);
  
  // Check if already liked from localStorage
  React.useEffect(() => {
    if (commentId) {
      const likedComments = JSON.parse(localStorage.getItem('liked_danmaku') || '[]');
      setIsLiked(likedComments.includes(commentId));
    }
  }, [commentId]);
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (animationRef.current) {
      animationRef.current.pause();
    }
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (animationRef.current) {
      animationRef.current.play();
    }
  };
  
  const handleLike = (e) => {
    e.stopPropagation();
    if (!commentId) return;
    
    // Only prevent multiple likes from same user locally
    if (isLiked) return;
    
    // Update local state
    setIsLiked(true);
    setCurrentLikes(prev => prev + 1);
    
    // Save to localStorage
    const likedComments = JSON.parse(localStorage.getItem('liked_danmaku') || '[]');
    likedComments.push(commentId);
    localStorage.setItem('liked_danmaku', JSON.stringify(likedComments));
    
    // Call parent callback
    if (onLike) {
      onLike(commentId);
    }
  };
  
  React.useEffect(() => {
    console.log('[DanmakuComment] Created:', { id: danmakuId.current, text: initialTextRef.current });
    
    if (!commentRef.current || animationRef.current) return;
    
    const element = commentRef.current;
    const containerWidth = window.innerWidth;
    const elementWidth = element.offsetWidth;
    
    // Start from right side of screen
    element.style.left = `${containerWidth}px`;
    
    // Animate to left side (doubled duration for half speed)
    const animation = element.animate([
      { left: `${containerWidth}px` },
      { left: `-${elementWidth}px` }
    ], {
      duration: 16000, // 16 seconds to cross screen (2x slower)
      easing: 'linear'
    });
    
    animationRef.current = animation;
    
    animation.onfinish = () => {
      console.log('[DanmakuComment] Animation completed:', { id: danmakuId.current, text: initialTextRef.current });
      if (onComplete) onComplete();
    };
    
    return () => {
      console.log('[DanmakuComment] Cleanup:', { id: danmakuId.current, text: initialTextRef.current });
      if (animationRef.current) {
        animationRef.current.cancel();
        animationRef.current = null;
      }
    };
  }, []); // Remove dependencies to prevent recreation
  
  try {
    return (
      <div
        ref={commentRef}
        className="fixed top-0 z-50 pointer-events-auto cursor-pointer"
        style={{
          top: `${fixedTopPosition.current}px`,
          transform: `scale(${currentScale})`,
          transformOrigin: 'left center'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 glass-effect text-white text-base md:text-xl font-medium whitespace-nowrap rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200">
            {initialTextRef.current}
          </div>
          
          {/* Always show likes if count > 0 - now clickable */}
          {currentLikes > 0 && (
            <div 
              className={`flex items-center gap-1 px-3 py-2 glass-effect rounded-full cursor-pointer hover:bg-red-500 hover:bg-opacity-40 transition-all duration-200 ${isLiked ? 'bg-red-500 bg-opacity-30' : 'bg-white bg-opacity-10'}`}
              onClick={handleLike}
            >
              <div className={`icon-heart text-sm md:text-xl ${isLiked ? 'text-red-400' : 'text-white'}`}></div>
              <span className="text-white text-base md:text-xl font-medium">{currentLikes}</span>
            </div>
          )}
          
          {/* Show interactive like button on hover when no likes yet */}
          {isHovered && currentLikes === 0 && (
            <div 
              className={`flex items-center gap-1 px-3 py-2 glass-effect rounded-full hover:bg-red-500 hover:bg-opacity-30 cursor-pointer transition-all duration-200 ${isLiked ? 'bg-red-500 bg-opacity-20' : ''}`}
              onClick={handleLike}
            >
              <div className={`icon-heart text-sm md:text-xl ${isLiked ? 'text-red-400' : 'text-white'}`}></div>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('DanmakuComment component error:', error);
    return null;
  }
}