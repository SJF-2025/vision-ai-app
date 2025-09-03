'use client';

import { Header, HeaderName, HeaderGlobalBar } from '@carbon/react';

export default function AppHeader() {
  return (
    <Header aria-label="SJF X IBM VisionAI">
      <HeaderName prefix="SJF X IBM">VisionAI</HeaderName>
      <HeaderGlobalBar />
    </Header>
  );
}


