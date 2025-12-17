
/**
 * Liquid Background Component
 *
 * Creates a fluid animation background effect using WebGL, automatically fills parent container
 *
 * Usage:
 * ```jsx
 * // Basic usage - automatically fills parent container
 * <LiquidBackground />
 *
 * // With custom styles
 * <LiquidBackground className="rounded-lg border" />
 *
 * // In a fixed size container
 * <div className="w-[600px] h-[400px]">
 *   <LiquidBackground />
 * </div>
 * ```
 *
 * Dependencies (check if already included in HTML head before adding):
 *
 * - OGL (WebGL library): CDN: https://cdn.jsdelivr.net/npm/ogl
 * - Tailwind Merge: https://cdn.jsdelivr.net/npm/tailwind-merge@3.3.1/dist/bundle-cjs.min.js
 * - clsx: for conditional class names
 *
 * cn utility function setup (only if not already exists):
 * ```js
 * export function cn(...inputs) {
 *   return twMerge(clsx(inputs))
 * }
 * ```
 * The cn function combines clsx for conditional classes with twMerge for Tailwind CSS class deduplication and conflict resolution.
 *
 * Notes:
 * - Check HTML head for existing dependencies before adding
 * - Parent container must have explicit width and height
 * - Requires browser WebGL support
 * - Component automatically adapts to container size changes
 *
 * Props:
 * @param {Object} props
 * @param {string} [props.className]
 */
function LiquidBackground({ className }) {
  /** @type {import('react').RefObject<HTMLDivElement>} */
  const containerRef = React.useRef(null);

  /** @type {number} */
  let animateId;

  /** @type {Renderer} */
  let renderer;

  /** @type {WebGLRenderingContext} */
  let gl;

  /** @type {Mesh} */
  let mesh;

  // Vertex shader - defines geometry shape
  const vert = `
    attribute vec2 uv;
    attribute vec2 position;
    
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
  `;

  // Fragment shader - generates fluid animation effects
  const frag = `
    precision highp float;
    
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uResolution;
    
    varying vec2 vUv;
    
    void main() {
        float mr = min(uResolution.x, uResolution.y);
        vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;
    
        float d = -uTime * 1.2;
        float a = 0.0;
        for (float i = 0.0; i < 8.0; ++i) {
            a += cos(i - d - a * uv.x);
            d += sin(uv.y * i + a);
        }
        d += uTime * 1.0;
        
        // Create dynamic color mixing with black, blue, yellow, red
        vec3 black = vec3(0.05, 0.05, 0.1);
        vec3 blue = vec3(0.0, 0.2, 0.7);
        vec3 yellow = vec3(1.0, 0.9, 0.2);
        vec3 red = vec3(1.0, 0.0, 0.0);
        
        float noise1 = cos(uv.x * 3.0 + d) * 0.5 + 0.5;
        float noise2 = sin(uv.y * 2.5 + a) * 0.5 + 0.5;
        float noise3 = cos(length(uv) * 4.0 + uTime * 0.5) * 0.5 + 0.5;
        
        vec3 col1 = mix(black, blue, noise1);
        vec3 col2 = mix(yellow, red, noise2);
        vec3 finalCol = mix(col1, col2, noise3);
        
        // Add some dynamic variation
        finalCol = mix(finalCol, uColor, 0.3);
        
        gl_FragColor = vec4(finalCol, 1.0);
    }
  `;

  React.useEffect(() => {
    if (!containerRef.current) return;

    // Check if OGL is available, if not, retry after a short delay
    const initializeOGL = () => {
      if (!window.OGL) {
        setTimeout(initializeOGL, 100); // Retry after 100ms
        return;
      }

      const { Renderer, Program, Mesh, Color, Triangle } = window.OGL;

    // Initialize WebGL renderer
    renderer = new Renderer();
    gl = renderer.gl;
    gl.clearColor(1, 1, 1, 1);

    // Responsive size adjustment
    const resize = () => {
      if (!containerRef.current) return;
      const scale = 1;
      renderer.setSize(
        containerRef.current.offsetWidth * scale,
        containerRef.current.offsetHeight * scale
      );
      if (mesh) {
        mesh.program.uniforms.uResolution.value = [
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / gl.canvas.height,
        ];
      }
    };

    // Animation loop
    const update = (t) => {
      animateId = requestAnimationFrame(update);
      if (mesh) {
        mesh.program.uniforms.uTime.value = t * 0.001;
        renderer.render({ scene: mesh });
      }
    };

    window.addEventListener("resize", resize, false);
    resize();

    // Create geometry and shader program
    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex: vert,
      fragment: frag,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(0.1, 0.3, 0.8) }, // Deep blue base color
        uResolution: {
          value: [
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height,
          ],
        },
      },
    });

    // Create mesh and start animation
    mesh = new Mesh(gl, { geometry, program });
    animateId = requestAnimationFrame(update);

    // Set canvas styles to ensure proper positioning and sizing
    gl.canvas.style.position = "absolute";
    gl.canvas.style.top = "0";
    gl.canvas.style.left = "0";
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";

    containerRef.current.appendChild(gl.canvas);

      // Cleanup function
      return () => {
        cancelAnimationFrame(animateId);
        window.removeEventListener("resize", resize);
        if (containerRef.current && gl?.canvas) {
          containerRef.current.removeChild(gl.canvas);
        }
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
      };
    };

    // Start initialization
    initializeOGL();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative block size-full", className)}
    />
  );
}
