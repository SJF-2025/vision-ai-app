'use client';

import { Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction } from '@carbon/react';
import { View } from '@carbon/icons-react';

export default function AppHeader() {
  return (
    <Header aria-label="SJF X IBM VisionAI">
      <HeaderName prefix="SJF X IBM">VisionAI</HeaderName>
      <HeaderGlobalBar>
        <HeaderGlobalAction aria-label="Vision preview" tooltipAlignment="end">
          <View size={20} aria-hidden="true" />
        </HeaderGlobalAction>
      </HeaderGlobalBar>
    </Header>
  );
}


