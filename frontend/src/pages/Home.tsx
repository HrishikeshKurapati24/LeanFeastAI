import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import heroVideo from "../assets/Hero_Section_Video_for_LeanFeastAI.mp4";
import Toast from "../components/Toast";

export default function Home() {
  const location = useLocation();
  const [currentRecipe, setCurrentRecipe] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const recipeExamples = [
    "meals just for you 🍽️",
    "nutrition that fits your goals 📊",
    "audio-guided step-by-step cooking 🎧"
  ];

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let charIndex = 0;
    const currentText = recipeExamples[currentRecipe];

    // Reset displayed text when recipe changes
    setDisplayedText("");
    setIsTyping(true);
    charIndex = 0;

    // Type out the text letter by letter
    const typeText = () => {
      if (charIndex < currentText.length) {
        setDisplayedText(currentText.substring(0, charIndex + 1));
        charIndex++;
        timeoutId = setTimeout(typeText, 100); // 100ms delay between characters
      } else {
        // Finished typing, wait before moving to next recipe
        setIsTyping(false);
        timeoutId = setTimeout(() => {
          setCurrentRecipe((prev) => (prev + 1) % recipeExamples.length);
        }, 2000); // Wait 2 seconds before starting next recipe
      }
    };

    typeText();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentRecipe]);

  // Scroll animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".scroll-fade-in").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Check for messages from navigation state
  useEffect(() => {
    if (location.state?.message) {
      setToastMessage(location.state.message);
      setShowToast(true);
      // Clear the state to prevent showing the message again on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Parallax scrolling effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll('.parallax-slow, .parallax-medium, .parallax-fast');

      parallaxElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const speed = el.classList.contains('parallax-slow') ? 0.3 :
          el.classList.contains('parallax-medium') ? 0.5 : 0.7;

        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const yPos = -(scrolled * speed);
          (el as HTMLElement).style.transform = `translateY(${yPos}px)`;
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={5000}
      />

      <div
        className="min-h-screen font-sans"
        style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(248, 252, 250, 0.98) 30%, rgba(240, 253, 244, 0.97) 60%, rgba(240, 253, 244, 0.95) 100%)'
        }}
      >

        {/* Hero Section */}
        <section className="relative py-4 sm:py-6 md:py-8 lg:py-12 xl:py-16 pb-8 sm:pb-12 md:pb-16 lg:pb-24 xl:pb-32 overflow-hidden z-10" style={{ background: 'rgba(248, 252, 250, 0.98)' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-12 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left fade-in-up max-w-3xl mx-auto lg:mx-0">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold text-neutral-25 mb-2 sm:mb-3 leading-tight">
                  Your personal cooking assistant.
                </h1>
                <h1 className="text-3xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight">
                  <span className="text-primary">Nutrition & Cooking</span> <span className="text-accent" style={{ color: '#ff7b5c' }}>made personal ✨</span>
                </h1>

                <div className="mb-3 sm:mb-4 md:mb-6 min-h-[35px] sm:min-h-[40px] md:min-h-[60px]">
                  <p className="text-lg sm:text-lg md:text-xl lg:text-xl xl:text-2xl font-semibold text-primary mb-1.5 sm:mb-2">
                    Crafting{" "}
                    <span className="inline-block min-w-[150px] sm:min-w-[200px] md:min-w-[250px] text-left">
                      <span
                        className="inline-block border-r-2 border-primary pr-1 sm:pr-2"
                        style={{
                          animation: `blink 1s step-end infinite`,
                          borderColor: isTyping ? '#22c55e' : 'transparent'
                        }}
                      >
                        {displayedText}
                      </span>
                    </span>
                  </p>
                </div>

                <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 md:mb-8 max-w-2xl mx-auto lg:mx-0" style={{ color: '#6b7280' }}>
                  Your all-in-one AI cooking assistant — create, optimize, and cook personalized meals with audio-guided step-by-step instructions. From optimizing recipes to replacing ingredients, LeanFeastAI makes every meal smarter.
                </p>

                <div className="flex justify-center lg:justify-start">
                  <Link
                    to="/feast-studio"
                    className="make-feast-btn px-4 sm:px-6 md:px-10 py-2 sm:py-2.5 md:py-3 lg:py-4 text-sm sm:text-base md:text-lg"
                    style={{
                      background: 'linear-gradient(135deg, #ff7b5c, #ff5a5f)',
                      color: 'white',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      boxShadow: '0 4px 10px rgba(255, 90, 95, 0.3)',
                      transition: 'all 0.2s ease',
                      display: 'inline-block',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 14px rgba(255, 90, 95, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(255, 90, 95, 0.3)';
                    }}
                  >
                    Make My Feast
                  </Link>
                </div>
              </div>

              {/* Right Content - Video with Floating Ingredients */}
              <div className="relative parallax-medium">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <video
                    className="w-full h-auto"
                    autoPlay
                    muted
                    loop
                    playsInline
                  >
                    <source src={heroVideo} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  {/* Floating Ingredients */}
                  <div className="absolute top-4 right-4 float-animation parallax-fast" style={{ animationDelay: '0s' }}>🥑</div>
                  <div className="absolute top-1/4 left-4 float-animation parallax-slow" style={{ animationDelay: '1s' }}>🍅</div>
                  <div className="absolute bottom-1/4 right-8 float-animation parallax-medium" style={{ animationDelay: '2s' }}>🥕</div>
                  <div className="absolute bottom-4 left-8 float-animation parallax-fast" style={{ animationDelay: '1.5s' }}>🌶️</div>
                </div>
              </div>
            </div>
          </div>
          {/* Animated Wave Separator */}
          <div className="absolute bottom-0 left-0 right-0 z-0" style={{ marginBottom: '-1px' }}>
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
              <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#dcfce7" className="animate-wave" />
            </svg>
          </div>
          {/* Soft Divider/Shadow for separation from hero section */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1 z-0"
            style={{
              background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0.08) 50%, transparent 100%)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04), 0 2px 6px rgba(0, 0, 0, 0.02)'
            }}
          ></div>
        </section>

        {/* Why You'll Love It Section */}
        <section className="relative py-6 sm:py-8 md:py-12 lg:py-16 pb-8 sm:pb-12 md:pb-16 lg:pb-24 xl:pb-32 bg-secondary-light z-20" style={{ marginTop: '-1px' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:mb-12 scroll-fade-in">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-primary mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">
                Why You'll Love It <span className="text-accent">😋</span>
              </h2>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-neutral-61 max-w-3xl mx-auto">
                Your personalized nutrition companion that learns your preferences, tracks your goals, and guides you through every meal.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8">
              {[
                {
                  icon: "🤖",
                  title: "Hands-Free Cooking 🎧",
                  description: "Voice-activated step-by-step guidance. Say 'LeanFeast' to control timers, navigate steps, and more - all hands-free!",
                  hoverText: "Cook without touching your device"
                },
                {
                  icon: "📊",
                  title: "Know Every Bite 📈",
                  description: "Track nutrition that adapts to your personal goals",
                  hoverText: "Track your nutrition effortlessly"
                },
                {
                  icon: "🔄",
                  title: "Swap Ingredients Smartly 🔀",
                  description: "Your companion suggests alternatives based on your needs",
                  hoverText: "Cream → Greek Yogurt"
                },
                {
                  icon: "👥",
                  title: "Share & Discover 👥",
                  description: "Connect with a community that shares your passion",
                  hoverText: "Join 10,000+ food lovers"
                },
                {
                  icon: "🎯",
                  title: "Optimize Any Recipe ⚡",
                  description: "Your companion personalizes any meal to your goals",
                  hoverText: "Make it healthier instantly"
                },
                {
                  icon: "💾",
                  title: "Save Your Favorites 💚",
                  description: "Your companion remembers what you love",
                  hoverText: "Never lose a recipe again"
                }
              ].map((feature, index) => (
                <div
                  key={index}
                  className="scroll-fade-in group text-center p-2 sm:p-3 md:p-4 lg:p-6 rounded-lg sm:rounded-xl hover:shadow-2xl transition-all duration-300 bg-secondary-lightest glass-effect transform hover:-translate-y-2 hover:scale-105 cursor-pointer"
                >
                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 transform group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                  <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-primary mb-1 sm:mb-1.5 md:mb-2 lg:mb-3">{feature.title}</h3>
                  <p className="text-xs sm:text-sm md:text-base text-neutral-61 mb-1 sm:mb-1.5 md:mb-2">{feature.description}</p>
                  <p className="text-xs sm:text-sm text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {feature.hoverText}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Animated Wave Separator */}
          <div className="absolute bottom-0 left-0 right-0 z-0" style={{ marginBottom: '-1px' }}>
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
              <path d="M0 0L60 15C120 30 240 60 360 75C480 90 600 90 720 82.5C840 75 960 60 1080 52.5C1200 45 1320 45 1380 45L1440 45V0H1380C1320 0 1200 0 1080 0C960 0 840 0 720 0C600 0 480 0 360 0C240 0 120 0 60 0H0Z" fill="#ffffff" />
            </svg>
          </div>
        </section>

        {/* Get Started Today - Gamified */}
        <section className="relative py-6 sm:py-8 md:py-12 lg:py-16 z-30" style={{ background: 'rgba(248, 252, 250, 0.98)', marginTop: '-1px' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:mb-12 scroll-fade-in">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-primary mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">
                Get Started Today
              </h2>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-neutral-61">
                Choose how you'd like to begin your healthy cooking journey
              </p>
            </div>

            {/* Visual Journey Bar */}
            <div className="flex justify-center items-center mb-4 sm:mb-6 md:mb-8 lg:mb-12 scroll-fade-in">
              <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-4">
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full text-white flex items-center justify-center font-bold text-sm sm:text-base md:text-lg shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #ff7b5c, #ff5a5f)', boxShadow: '0 4px 10px rgba(255, 90, 95, 0.3)' }}
                  >
                    1
                  </div>
                  <p className="text-xs text-neutral-61 mt-1 sm:mt-2">Describe</p>
                </div>
                <div
                  className="w-8 sm:w-12 md:w-16 h-1"
                  style={{ background: 'linear-gradient(90deg, #ff7b5c 0%, #22c55e 100%)' }}
                ></div>
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full text-white flex items-center justify-center font-bold text-sm sm:text-base md:text-lg shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                  >
                    2
                  </div>
                  <p className="text-xs text-neutral-61 mt-1 sm:mt-2">Generate</p>
                </div>
                <div
                  className="w-8 sm:w-12 md:w-16 h-1"
                  style={{ background: 'linear-gradient(90deg, #22c55e 0%, #40e0d0 100%)' }}
                ></div>
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full text-white flex items-center justify-center font-bold text-sm sm:text-base md:text-lg shadow-lg"
                    style={{ background: '#40e0d0' }}
                  >
                    3
                  </div>
                  <p className="text-xs text-neutral-61 mt-1 sm:mt-2">Cook</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
              {/* Make My Feast Card */}
              <div
                className="scroll-fade-in rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 lg:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-accent"
                style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full text-neutral-255 mb-2 sm:mb-3 md:mb-4 shadow-lg transform hover:scale-110 transition-transform duration-300"
                    style={{ background: 'linear-gradient(135deg, #ff7b5c, #ff5a5f)', boxShadow: '0 4px 10px rgba(255, 90, 95, 0.3)' }}
                  >
                    <svg className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-primary mb-2 sm:mb-3 md:mb-4">Make My Feast</h3>
                  <p className="text-xs sm:text-sm md:text-base text-neutral-61 mb-3 sm:mb-4 md:mb-6">
                    Tell your kitchen companion what you're craving. Get a personalized meal with hands-free voice-controlled cooking, complete nutrition tracking, and smart timer management.
                  </p>
                  <Link
                    to="/feast-studio"
                    className="w-full hover:shadow-xl text-neutral-255 font-semibold py-2 sm:py-2.5 md:py-3 lg:py-4 xl:py-5 px-4 sm:px-5 md:px-6 lg:px-8 rounded-full transition-all duration-300 inline-block transform hover:scale-105 text-xs sm:text-sm md:text-base"
                    style={{ background: 'linear-gradient(135deg, #ff7b5c, #ff5a5f)', boxShadow: '0 4px 10px rgba(255, 90, 95, 0.3)' }}
                  >
                    Make My Feast →
                  </Link>
                </div>
              </div>

              {/* Community Hub Card */}
              <div
                className="scroll-fade-in rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 lg:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-accent-turquoise"
                style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}
              >
                <div className="text-center">
                  <div
                    className="mx-auto flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full text-neutral-255 mb-2 sm:mb-3 md:mb-4 shadow-lg transform hover:scale-110 transition-transform duration-300"
                    style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                  >
                    <svg className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-primary mb-2 sm:mb-3 md:mb-4">Community Recipe Hub</h3>
                  <p className="text-xs sm:text-sm md:text-base text-neutral-61 mb-3 sm:mb-4 md:mb-6">
                    Discover, search, and filter recipes created by our community. Find inspiration for your next healthy meal.
                  </p>
                  <Link
                    to="/explore-community"
                    className="w-full hover:shadow-xl text-neutral-255 font-semibold py-2 sm:py-2.5 md:py-3 lg:py-4 xl:py-5 px-4 sm:px-5 md:px-6 lg:px-8 rounded-full transition-all duration-300 inline-block transform hover:scale-105 text-xs sm:text-sm md:text-base"
                    style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                  >
                    Explore Recipes →
                  </Link>
                </div>
              </div>
            </div>

            {/* Recipe of the Week Preview */}
            <div className="mt-6 sm:mt-8 md:mt-12 scroll-fade-in">
              <div className="bg-secondary-light rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border-2 border-primary-light">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary mb-1.5 sm:mb-2">✨ Recipe of the Week</h3>
                <p className="text-xs sm:text-sm md:text-base text-neutral-61">"Mediterranean Quinoa Bowl with Roasted Vegetables" - Try this community favorite!</p>
              </div>
            </div>
          </div>
        </section>


        {/* How It Works - Timeline Layout */}
        <section className="relative py-6 sm:py-8 md:py-12 lg:py-16 pb-8 sm:pb-12 md:pb-16 lg:pb-24 xl:pb-32 bg-neutral-255 z-40">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:mb-12 scroll-fade-in">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-primary mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">
                How Your Companion Works
              </h2>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-neutral-61">
                Your smart kitchen assistant adapts to you in three simple steps
              </p>
            </div>

            {/* Horizontal Timeline */}
            <div className="relative">
              {/* Connection Line */}
              <div className="hidden md:block absolute top-12 left-0 right-0 h-1" style={{ paddingLeft: '15%', paddingRight: '15%' }}>
                <div className="h-full" style={{ background: 'linear-gradient(90deg, #ff7b5c 0%, #22c55e 50%, #40e0d0 100%)' }}></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8 relative">
                {[
                  {
                    step: "1",
                    title: "Describe Your Meal & Save Preferences",
                    description: "Tell your companion what you're craving and save your dietary preferences, restrictions, and health goals for future meals",
                    icon: "⌨️"
                  },
                  {
                    step: "2",
                    title: "Get Your Personalized Meal",
                    description: "Your companion crafts a meal considering your description, saved preferences, dietary needs, and health goals",
                    icon: "🤖"
                  },
                  {
                    step: "3",
                    title: "Cook Hands-Free",
                    description: "Hands-free voice commands, audio-guided instructions, smart timers, and detailed nutrition tracking - all controlled by your voice",
                    icon: "🍽️"
                  }
                ].map((step, index) => (
                  <div key={index} className="scroll-fade-in text-center relative z-10">
                    {/* Step Number with Icon */}
                    <div className="mb-2 sm:mb-3 md:mb-4 lg:mb-6">
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full text-white text-lg sm:text-xl md:text-2xl lg:text-3xl flex items-center justify-center font-bold shadow-xl transform hover:scale-110 transition-transform duration-300 mx-auto"
                        style={{
                          background: index === 0 ? 'linear-gradient(135deg, #ff7b5c, #ff5a5f)' :
                            index === 1 ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' :
                              'linear-gradient(135deg, #40e0d0 0%, #2dd4bf 100%)'
                        }}
                      >
                        <span className="text-base sm:text-lg md:text-xl lg:text-2xl">{step.icon}</span>
                      </div>
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-primary mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">{step.title}</h3>
                    <p className="text-xs sm:text-sm md:text-base text-neutral-61">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Animated Wave Separator */}
          <div className="absolute bottom-0 left-0 right-0 z-0" style={{ marginBottom: '-1px' }}>
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
              <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#dcfce7" />
            </svg>
          </div>
        </section>

        {/* Persona Cards - What is LeanFeastAI for You? */}
        <section className="relative py-6 sm:py-8 md:py-12 lg:py-16 xl:py-24 bg-secondary-light z-50" style={{ marginTop: '-1px' }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:mb-12 scroll-fade-in">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-primary mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">
                What is LeanFeastAI for You?
              </h2>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-neutral-61 max-w-3xl mx-auto">
                Your personalized nutrition & cooking companion that understands your unique needs and goals
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8">
              {[
                {
                  persona: "For Busy Students 📚",
                  avatar: "🎓",
                  description: "Quick, nutritious meals that fit your schedule and budget",
                  prompt: "Generate a 15-minute protein-packed breakfast under $5"
                },
                {
                  persona: "For Fitness Lovers 💪",
                  avatar: "🏋️",
                  description: "High-protein recipes tailored to your workout goals",
                  prompt: "Create a post-workout meal with 40g protein"
                },
                {
                  persona: "For Health Enthusiasts 🌱",
                  avatar: "🥗",
                  description: "Plant-based, nutrient-dense meals for optimal wellness",
                  prompt: "Make a vegan Buddha bowl with 20+ vitamins"
                },
                {
                  persona: "For Busy Parents 👨‍👩‍👧",
                  avatar: "👪",
                  description: "Family-friendly meals everyone will love",
                  prompt: "Generate a kid-friendly dinner with hidden veggies"
                },
                {
                  persona: "For Weight Watchers ⚖️",
                  avatar: "🎯",
                  description: "Calorie-controlled recipes that satisfy cravings",
                  prompt: "Create a low-calorie dessert under 200 calories"
                },
                {
                  persona: "For Food Explorers 🌍",
                  avatar: "✈️",
                  description: "Discover authentic flavors from around the world",
                  prompt: "Generate a traditional Japanese comfort meal"
                }
              ].map((persona, index) => (
                <div
                  key={index}
                  className="scroll-fade-in rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 lg:p-6 hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-accent transform hover:-translate-y-2 cursor-pointer group"
                  style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}
                >
                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 text-center transform group-hover:scale-110 transition-transform duration-300">{persona.avatar}</div>
                  <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-primary mb-1 sm:mb-1.5 md:mb-2 lg:mb-3 text-center">{persona.persona}</h3>
                  <p className="text-xs sm:text-sm md:text-base text-neutral-61 mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 text-center">{persona.description}</p>
                  <p className="text-xs text-neutral-61 text-center italic bg-secondary-lighter p-1 sm:p-1.5 md:p-2 lg:p-3 rounded-lg">{persona.prompt}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Separator before footer */}
          <div className="absolute bottom-0 left-0 right-0 z-0" style={{ marginBottom: '-1px' }}>
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
              <path d="M0 0L60 15C120 30 240 60 360 75C480 90 600 90 720 82.5C840 75 960 60 1080 52.5C1200 45 1320 45 1380 45L1440 45V0H1380C1320 0 1200 0 1080 0C960 0 840 0 720 0C600 0 480 0 360 0C240 0 120 0 60 0H0Z" fill="#ffffff" />
            </svg>
          </div>
        </section>
      </div>
    </>
  );
}