/**
 * DanmakuManager Component
 * Manages danmaku display and auto-play logic
 */
function DanmakuManager({ userId, onCommentsUpdate, visible = true }) {
  const [comments, setComments] = React.useState([]);
  const [activeDanmaku, setActiveDanmaku] = React.useState([]);
  const [playedCommentIds, setPlayedCommentIds] = React.useState(new Set());
  const [autoPlayTimer, setAutoPlayTimer] = React.useState(null);
  const [restartTimer, setRestartTimer] = React.useState(null);
  const isProcessingRef = React.useRef(false);
  const isRestartingRef = React.useRef(false);
  
  const handleLike = async (commentId) => {
    try {
      // Get current comment data
      const comment = await trickleGetObject('danmaku_comment', commentId);
      const currentLikes = comment.objectData.likes_count || 0;
      
      // Update likes count in database
      await trickleUpdateObject('danmaku_comment', commentId, {
        ...comment.objectData,
        likes_count: currentLikes + 1
      });
      
      console.log('[DanmakuManager] Updated likes for comment:', commentId);
    } catch (error) {
      console.error('[DanmakuManager] Error updating likes:', error);
    }
  };
  
  // Load comments from database
  const loadComments = async () => {
    console.log('[DanmakuManager] Loading comments from database');
    try {
      const allComments = await trickleListObjects('danmaku_comment', 99999, true);
      const commentsData = allComments.items.map(item => ({
        id: item.objectId,

        text: item.objectData.text,
        createdAt: item.createdAt,
        likesCount: item.objectData.likes_count || 0
      }));
      
      console.log('[DanmakuManager] Loaded comments:', commentsData.length);
      setComments(commentsData);
      
      // Update parent component
      if (onCommentsUpdate) {
        onCommentsUpdate(commentsData);
      }
    } catch (error) {
      console.error('[DanmakuManager] Error loading comments:', error);
    }
  };

  // Load comments when component mounts or userId changes
  React.useEffect(() => {
    if (userId) {
      console.log('[DanmakuManager] UserId available, loading comments:', userId);
      loadComments();
    }
  }, [userId]);

  // Auto-play danmaku for new comments - only trigger on comments change, not playedCommentIds change
  React.useEffect(() => {
    if (isProcessingRef.current || isRestartingRef.current) {
      console.log('[DanmakuManager] Already processing or restarting, skipping');
      return;
    }
    
    console.log('[DanmakuManager] Comments updated:', comments?.length || 0);
    console.log('[DanmakuManager] Played comment IDs:', Array.from(playedCommentIds));
    console.log('[DanmakuManager] Current active danmaku:', activeDanmaku.length);
    
    if (!comments || comments.length === 0) {
      console.log('[DanmakuManager] No comments available, skipping auto-play');
      return;
    }
    
    // Find new comments that haven't been played yet and have valid text
    // Sort with semi-random ordering (mix of chronological and random)
    const newComments = comments
      .filter(comment => 
        !playedCommentIds.has(comment.id) && 
        comment.text && 
        typeof comment.text === 'string' && 
        comment.text.trim() !== ''
      )
      .sort((a, b) => {
        // Primary sort by creation time (chronological)
        const timeSort = new Date(a.createdAt) - new Date(b.createdAt);
        // Add some randomness but keep general chronological order
        const randomFactor = (Math.random() - 0.5) * 2000; // ±1 second random variance
        return timeSort + randomFactor;
      });
    
    console.log('[DanmakuManager] New comments to play:', newComments.length, newComments.map(c => ({ id: c.id, text: c.text.substring(0, 20) + '...' })));
    
    if (newComments.length === 0) {
      console.log('[DanmakuManager] No new comments to play');
      return;
    }
    
    isProcessingRef.current = true;
    
    // Clear existing timer
    if (autoPlayTimer) {
      console.log('[DanmakuManager] Clearing existing auto-play timer');
      clearTimeout(autoPlayTimer);
    }
    
    // Start auto-play with delay
    console.log('[DanmakuManager] Starting auto-play timer (1s delay)');
    const timer = setTimeout(() => {
      playNextBatch(newComments);
      isProcessingRef.current = false;
    }, 1000);
    
    setAutoPlayTimer(timer);
    
    return () => {
      if (timer) {
        console.log('[DanmakuManager] Cleanup: clearing timer');
        clearTimeout(timer);
        isProcessingRef.current = false;
      }
      if (restartTimer) {
        console.log('[DanmakuManager] Cleanup: clearing restart timer');
        clearTimeout(restartTimer);
        isRestartingRef.current = false;
      }
    };
  }, [comments]); // Only depend on comments, not playedCommentIds

  // Handle restart when playedCommentIds is cleared (restart scenario)
  React.useEffect(() => {
    // Only trigger when playedCommentIds becomes empty and we have comments
    if (playedCommentIds.size === 0 && comments.length > 0 && !isProcessingRef.current && isRestartingRef.current) {
      console.log('[DanmakuManager] Restart detected - playedCommentIds cleared, starting fresh cycle');
      isRestartingRef.current = false; // Reset restart flag
      
      // Find all valid comments to play
      const allComments = comments
        .filter(comment => 
          comment.text && 
          typeof comment.text === 'string' && 
          comment.text.trim() !== ''
        )
        .sort((a, b) => {
          const timeSort = new Date(a.createdAt) - new Date(b.createdAt);
          const randomFactor = (Math.random() - 0.5) * 2000;
          return timeSort + randomFactor;
        });
      
      if (allComments.length > 0) {
        console.log('[DanmakuManager] Starting restart batch with', allComments.length, 'comments');
        isProcessingRef.current = true;
        
        setTimeout(() => {
          playNextBatch(allComments);
          isProcessingRef.current = false;
        }, 1000);
      }
    }
  }, [playedCommentIds.size, comments.length]); // Monitor size changes

  const playNextBatch = (commentsToPlay) => {
    console.log('[DanmakuManager] playNextBatch called with', commentsToPlay.length, 'comments');
    
    if (commentsToPlay.length === 0) {
      console.log('[DanmakuManager] No more comments to play, batch complete');
      return;
    }
    
    // Determine how many danmaku to play simultaneously based on screen size
    const isMobile = window.innerWidth < 768; // md breakpoint
    const maxConcurrent = isMobile 
      ? 8 + Math.floor(Math.random() * 5)   // Mobile: 8-12 concurrent
      : 20 + Math.floor(Math.random() * 16); // Desktop: 20-35 concurrent
    
    const currentActive = activeDanmaku.length;
    const canAdd = Math.max(0, maxConcurrent - currentActive);
    const toPlayNow = Math.min(canAdd, commentsToPlay.length, isMobile ? 2 : 3); // Mobile: max 2 at once, Desktop: max 3
    
    console.log('[DanmakuManager] Target concurrent:', maxConcurrent, 'Current active:', currentActive, 'Can add:', canAdd, 'Will play now:', toPlayNow);
    
    // Play multiple comments at once
    for (let i = 0; i < toPlayNow; i++) {
      const comment = commentsToPlay[i];
      console.log('[DanmakuManager] Playing comment:', { id: comment.id, text: comment.text });
      addDanmaku(comment.text, comment);
      
      // Mark as played
      setPlayedCommentIds(prev => {
        const newSet = new Set([...prev, comment.id]);
        console.log('[DanmakuManager] Marked comment as played:', comment.id);
        return newSet;
      });
    }
    
    // Continue with remaining comments after random delay
    const remaining = commentsToPlay.slice(toPlayNow);
    if (remaining.length > 0) {
      const isMobile = window.innerWidth < 768;
      const randomDelay = isMobile 
        ? 2500 + Math.random() * 3000  // Mobile: 2.5-5.5 seconds (slower)
        : 1500 + Math.random() * 2000; // Desktop: 1.5-3.5 seconds
      
      console.log('[DanmakuManager] Scheduling next batch in', Math.round(randomDelay/100)/10, 'seconds, remaining:', remaining.length, 'Device:', isMobile ? 'Mobile' : 'Desktop');
      setTimeout(() => {
        playNextBatch(remaining);
      }, randomDelay);
    } else {
      console.log('[DanmakuManager] All comments in batch played');
    }
  };

  const addDanmaku = (text, commentData = null) => {
    // Filter out empty, null, or undefined text
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.log('[DanmakuManager] Skipping empty danmaku:', text);
      return;
    }
    
    const id = Date.now() + Math.random();
    const newDanmaku = { 
      id, 
      text: text.trim(),
      commentId: commentData?.id || null,
      likesCount: commentData?.likesCount || 0
    };
    
    console.log('[DanmakuManager] Adding danmaku:', { id, text: text.trim(), commentId: newDanmaku.commentId });
    setActiveDanmaku(prev => {
      const updated = [...prev, newDanmaku];
      console.log('[DanmakuManager] Active danmaku count:', updated.length);
      return updated;
    });
  };

  const removeDanmaku = (id) => {
    console.log('[DanmakuManager] Removing danmaku:', id);
    setActiveDanmaku(prev => {
      const updated = prev.filter(item => item.id !== id);
      console.log('[DanmakuManager] Active danmaku count after removal:', updated.length);
      console.log('[DanmakuManager] Total comments:', comments.length);
      console.log('[DanmakuManager] Played comments count:', playedCommentIds.size);
      console.log('[DanmakuManager] Is restarting:', isRestartingRef.current);
      
      // Check if all danmaku finished and all comments have been played
      if (updated.length === 0 && comments.length > 0 && playedCommentIds.size >= comments.length && !isRestartingRef.current) {
        console.log('[DanmakuManager] All danmaku finished, scheduling restart in 3 seconds');
        isRestartingRef.current = true;
        
        // Clear any existing restart timer
        if (restartTimer) {
          clearTimeout(restartTimer);
        }
        // Set 3-second restart timer
        const timer = setTimeout(() => {
          console.log('[DanmakuManager] Restarting danmaku loop - clearing played comments');
          setPlayedCommentIds(new Set());
          isProcessingRef.current = false; // Reset processing flag
        }, 3000);
        setRestartTimer(timer);
      }
      
      return updated;
    });
  };

  // Expose addDanmaku method to window for external access
  React.useEffect(() => {
    window.addDanmaku = (text) => {
      console.log('[DanmakuManager] Manual comment received via window:', text);
      addDanmaku(text);
    };
    
    return () => {
      delete window.addDanmaku;
    };
  }, []);

  try {
    return (
      <div style={{ display: visible ? 'block' : 'none' }}>
        {activeDanmaku.map(danmaku => (
          <DanmakuComment
            key={danmaku.id}
            text={danmaku.text}
            commentId={danmaku.commentId}
            likesCount={danmaku.likesCount}
            onComplete={() => removeDanmaku(danmaku.id)}
            onLike={handleLike}
          />
        ))}
      </div>
    );
  } catch (error) {
    console.error('DanmakuManager component error:', error);
    return null;
  }
}