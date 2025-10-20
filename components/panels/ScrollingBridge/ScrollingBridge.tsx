import { motion } from "framer-motion";
import Vector from "@/public/assets/Vector.svg";

const ScrollingBridge = () => {
  return (
    // <div className="w-1/2">
    <motion.div
      data-testid="scrolling-bridge-container"
      className="relative w-full h-full overflow-hidden flex justify-center"
      style={{
        maskImage:
          "linear-gradient(to left, transparent 5%, white 30%, white 100%)",
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div style={{ transform: "scale(0.55) translateY(-40%)", transformOrigin: "center" }}>
        <motion.div
          className="left-0 text-2xl whitespace-nowrap flex items-center"
          initial={{ x: "-25%" }}
          animate={{ x: "25%" }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          <div className="flex items-center">
            <Vector />
            <Vector />
          </div>
        </motion.div>
      </div>
    </motion.div>
    // </div>
  );
};

export default ScrollingBridge;
