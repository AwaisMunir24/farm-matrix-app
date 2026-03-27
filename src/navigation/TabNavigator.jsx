import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabNavigator from "./BottomNavigator";
import CameraScreen from "../screens/CameraScreen";
import ResultScreen from "../screens/ResultScreen";
import CropScan from "../screens/CropScan";
import AddNewFarmer from "../screens/AddNewFarmer";
import AddNewField from "../screens/AddNewField";
import DrawPolygonFields from "../screens/Draw-polygon-fields";
import FarmerListing from "../screens/FarmerListing";
import FieldsListing from "../screens/FieldsListing";
import Weather from "../screens/Weather";
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen name="Camera" component={CameraScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="Cropscan" component={CropScan} />
      <Stack.Screen name="AddFarmer" component={AddNewFarmer} />
      <Stack.Screen name="AddNewField" component={AddNewField} />
      <Stack.Screen name="FarmerListing" component={FarmerListing} />
      <Stack.Screen name="FieldsListing" component={FieldsListing} />
      <Stack.Screen name="DrawPolygonFields" component={DrawPolygonFields} />
      <Stack.Screen name="Weather" component={Weather} />
    </Stack.Navigator>
  );
};

export default TabNavigator;
