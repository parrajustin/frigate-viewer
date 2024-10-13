import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, StyleSheet, Text} from 'react-native';
import {Navigation, NavigationFunctionComponent} from 'react-native-navigation';
import {get} from '../../helpers/rest';
import {
  selectAvailableCameras,
  setAvailableCameras,
  setAvailableLabels,
  setAvailableZones,
} from '../../store/events';
import {
  fillGapsWithInitialData,
  selectCamerasNumColumns,
  selectServerApiUrl,
  selectServerCredentials,
} from '../../store/settings';
import {useAppDispatch, useAppSelector} from '../../store/store';
import {menuButton, useMenu} from '../menu/menuHelpers';
import {CameraTile} from './CameraTile';
import {messages} from './messages';
import {useNoServer} from '../settings/useNoServer';
import {Background} from '../../components/Background';
import {useStyles} from '../../helpers/colors';

interface IConfigResponse {
  cameras: Record<
    string,
    {
      zones: Record<string, unknown>;
    }
  >;
  objects: {
    track: string[];
  };
}

export const CamerasList: NavigationFunctionComponent = ({componentId}) => {
  const styles = useStyles(({theme}) => ({
    noCameras: {
      padding: 20,
      color: theme.text,
      textAlign: 'center',
    },
  }));

  useMenu(componentId, 'camerasList');
  useNoServer();
  const [loading, setLoading] = useState(true);
  const apiUrl = useAppSelector(selectServerApiUrl);
  const credentials = useAppSelector(selectServerCredentials);
  const cameras = useAppSelector(selectAvailableCameras);
  const numColumns = useAppSelector(selectCamerasNumColumns);
  const dispatch = useAppDispatch();
  const intl = useIntl();

  useEffect(() => {
    Navigation.mergeOptions(componentId, {
      topBar: {
        title: {
          text: intl.formatMessage(messages['topBar.title']),
        },
        leftButtons: [menuButton],
      },
    });
  }, [componentId, intl]);

  useEffect(() => {
    dispatch(fillGapsWithInitialData());
  }, [dispatch]);

  const refresh = useCallback(() => {
    setLoading(true);
    get<IConfigResponse>(`${apiUrl}/config`, credentials)
      .then(config => {
        const availableCameras = Object.keys(config.cameras);
        const availableLabels = config.objects.track;
        const availableZones = availableCameras.reduce(
          (zones, cameraName) => [
            ...zones,
            ...Object.keys(config.cameras[cameraName].zones).filter(
              zoneName => !zones.includes(zoneName),
            ),
          ],
          [] as string[],
        );
        dispatch(setAvailableCameras(availableCameras));
        dispatch(setAvailableLabels(availableLabels));
        dispatch(setAvailableZones(availableZones));
      })
      .catch(() => {
        dispatch(setAvailableCameras([]));
        return [];
      })
      .finally(() => {
        setLoading(false);
      });
  }, [apiUrl, dispatch]);

  useEffect(() => {
    if (apiUrl !== undefined) {
      refresh();
    }
  }, [refresh, apiUrl]);

  return (
    <Background>
      {!loading && cameras.length === 0 && (
        <Text style={styles.noCameras}>
          {intl.formatMessage(messages['noCameras'])}
        </Text>
      )}
      <FlatList
        data={cameras}
        renderItem={({item}) => (
          <CameraTile cameraName={item} componentId={componentId} />
        )}
        keyExtractor={cameraName => cameraName}
        refreshing={loading}
        onRefresh={refresh}
        numColumns={numColumns}
      />
    </Background>
  );
};
