import React, { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabNavigator from "./BottomNavigator";
import Sidebar from "./Sidebar";

import CameraScreen from "../screens/CameraScreen";
import ResultScreen from "../screens/ResultScreen";
import CropScan from "../screens/CropScan";
import AddNewFarmer from "../screens/AddNewFarmer";
import AddNewField from "../screens/AddNewField";
import DrawPolygonFields from "../screens/Draw-polygon-fields";
import FarmerListing from "../screens/FarmerListing";
import FieldsListing from "../screens/FieldsListing";
import Weather from "../screens/Weather";
import ChatScreen from "../screens/ChatScreen";
import ViewField from "../screens/ViewField";
import FieldBookDetails from "../screens/FieldBookDetails";
import SeedDetailsMobile from "../screens/SeedDetailMobile";
import LandPreparationMobile from "../screens/Landpreperationmobile";
import SowingMobile from "../screens/Sowingmobile";
import WeedManagementMobile from "../screens/Weedmanagmentmobile";
import IrrigationMobile from "../screens/Irrigationmobile";
import FertilizerMobile from "../screens/Fertilizermobile";
import PestDiseaseMobile from "../screens/Pestdiseasemobile";
import IssueReportedMobile from "../screens/Issuereportedmobile";
import AdvisoryMobile from "../screens/Advisorymobile";
import HarvestingMobile from "../screens/Harvestingmobile";

const Stack = createNativeStackNavigator();

const TabNavigator = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs">
          {(props) => (
            <BottomTabNavigator
              {...props}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="Cropscan" component={CropScan} />
        <Stack.Screen name="AddFarmer" component={AddNewFarmer} />
        <Stack.Screen name="AddNewField" component={AddNewField} />
        <Stack.Screen name="FarmerListing" component={FarmerListing} />
        <Stack.Screen name="FieldsListing" component={FieldsListing} />
        <Stack.Screen name="DrawPolygonFields" component={DrawPolygonFields} />
        <Stack.Screen name="Weather" component={Weather} />
        <Stack.Screen name="ViewField" component={ViewField} />
        <Stack.Screen name="FieldBookDetails" component={FieldBookDetails} />
        <Stack.Screen name="SeedDetailsMobile" component={SeedDetailsMobile} />
        <Stack.Screen name="SowingMobile" component={SowingMobile} />
        <Stack.Screen name="IrrigationMobile" component={IrrigationMobile} />
        <Stack.Screen name="FertilizerMobile" component={FertilizerMobile} />
        <Stack.Screen name="PestDiseaseMobile" component={PestDiseaseMobile} />
        <Stack.Screen name="AdvisoryMobile" component={AdvisoryMobile} />
        <Stack.Screen name="HarvestingMobile" component={HarvestingMobile} />
        <Stack.Screen
          name="IssueReportedMobile"
          component={IssueReportedMobile}
        />
        <Stack.Screen
          name="WeedManagementMobile"
          component={WeedManagementMobile}
        />
        <Stack.Screen
          name="LandPreparationMobile"
          component={LandPreparationMobile}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ animation: "slide_from_bottom" }}
        />
      </Stack.Navigator>

      {/* Sidebar overlays the entire app */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
      />
    </>
  );
};

export default TabNavigator;
