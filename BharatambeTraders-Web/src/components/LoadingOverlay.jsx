import React from "react";
import BrandLoader from "./BrandLoader";

const LoadingOverlay = ({ message = "Processing operation..." }) => {
  return <BrandLoader message={message} fullScreen={true} />;
};

export default LoadingOverlay;

