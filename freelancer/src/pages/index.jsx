import Companies from "../components/Landing/Companies";
import Everything from "../components/Landing/Everything";
import FreelancerBusiness from "../components/Landing/FreelancerBusiness";
import HeroBanner from "../components/Landing/HeroBanner";
import JoinFreelancer from "../components/Landing/JoinFreelancer";
import PopularServices from "../components/Landing/PopularServices";
import Services from "../components/Landing/Services";
import { useStateProvider } from "../context/StateContext";
import React from "react";
import AuthWrapper from "../components/AuthWrapper";

function Index() {
  const [{showLoginModal, showSignupModal}] = useStateProvider()
  return (
    <div>
      <HeroBanner />
      <Companies />
      <PopularServices />
      <Everything />
      <Services />
      <FreelancerBusiness />
      <JoinFreelancer />
      {
        (showLoginModal || showSignupModal) && (<AuthWrapper type={showLoginModal ? "login" : "signup"} />
        )} 
    </div>
  );
}

export default Index;