
/**
 * Generate a "random" 4 digit number
 */
const generateAuthCode = () => {
  const min = 1000; const max = 9999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};


export default generateAuthCode;
